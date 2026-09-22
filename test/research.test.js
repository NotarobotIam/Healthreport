// PubMed is replaced by a fake: no test here touches the network.
process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const pubmed = require('../lib/pubmed');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(async () => {
  pubmed._setPace(0);
  await startTestApp();
});
after(stopTestApp);

let calls;
let mode; // 'ok' | 'down' | 'evil'

const summaryFor = (ids, evil) => ({
  result: {
    uids: ids,
    ...Object.fromEntries(ids.map((id, i) => [id, {
      uid: id,
      title: evil ? `<img src=x onerror=alert(1)>Breast <i>cancer</i> &amp; screening &lt;script&gt; ${i}` : `Study number ${id}`,
      source: 'Journal of Testing',
      authors: [{ name: 'Ada A' }, { name: 'Bob B' }, { name: 'Cy C' }, { name: 'Dee D' }, { name: 'Eve E' }],
      epubdate: '2026 Sep 1',
      pubdate: '2026 Sep',
      sortpubdate: `2026/09/${String(10 + i).padStart(2, '0')} 00:00`,
      pubtype: ['Review', 'Journal Article'],
      url: 'javascript:alert(document.cookie)', // hostile: must never be used
    }])),
  },
});

pubmed._setFetch(async (url) => {
  calls.push(String(url));
  if (mode === 'down') throw new Error('network down');
  const u = new URL(url);
  const json = u.pathname.endsWith('esearch.fcgi')
    ? { esearchresult: { idlist: mode === 'evil' ? ['900', 'not-a-number', '901', '../etc/passwd'] : ['111', '222', '333'] } }
    : summaryFor((u.searchParams.get('id') || '').split(','), mode === 'evil');
  return { ok: true, status: 200, json: async () => json };
});

beforeEach(async () => {
  calls = [];
  mode = 'ok';
  await mongoose.model('ResearchItem').deleteMany({});
  await mongoose.model('ResearchFeed').deleteMany({});
});

const join = (u, ...slugs) => Promise.all(slugs.map((s) => api('POST', `/groups/${s}/join`, { token: u.token })));

test('research requires sign-in and validates its parameters', async () => {
  const u = await signUp();
  assert.equal((await api('GET', '/research')).status, 401);
  assert.equal((await api('GET', '/research?kind=gossip', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/research?kind[$ne]=research', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/research?group=nope', { token: u.token })).status, 404);
  assert.equal(calls.length, 0, 'bad requests must not cause outbound calls');
});

test('a member gets studies for the communities they joined, with links built from the PubMed id', async () => {
  const u = await signUp();
  await join(u, 'ibs');
  const r = await api('GET', '/research?kind=research', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.personalized, true);
  assert.ok(r.body.items.length >= 1);
  for (const item of r.body.items) {
    assert.equal(item.group.slug, 'ibs');
    assert.equal(item.url, `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`);
    assert.deepEqual(item.types, ['Review']);
    assert.ok(item.authors.length <= 3, 'at most three authors are kept');
  }
  assert.ok(r.body.items.every((i) => !JSON.stringify(i).includes('javascript:')), 'a URL from the remote service is never passed on');
});

test('what is sent to PubMed depends on the community topic only, never on who is asking', async () => {
  const u = await signUp({ handle: 'identifiable_user' });
  await join(u, 'breast-cancer');
  await api('GET', '/research?kind=research', { token: u.token });
  assert.ok(calls.length >= 2);
  for (const url of calls) {
    assert.ok(url.startsWith('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'), url);
    for (const secret of ['identifiable_user', u.email, u.id, 'Test%20Person', u.token]) {
      assert.ok(!url.includes(secret) && !decodeURIComponent(url).includes(secret), `outbound request leaked ${secret}`);
    }
  }
  const search = decodeURIComponent(calls.find((c) => c.includes('esearch'))).replace(/\+/g, ' ');
  assert.match(search, /"Breast Neoplasms"\[Majr\]/);
});

test('titles are stripped of markup and hostile ids are ignored', async () => {
  mode = 'evil';
  const u = await signUp();
  await join(u, 'breast-cancer');
  const r = await api('GET', '/research?kind=tests', { token: u.token });
  assert.deepEqual(r.body.items.map((i) => i.pmid).sort(), ['900', '901'], 'only numeric ids survive');
  for (const item of r.body.items) {
    assert.ok(!/[<>]/.test(item.title), `markup left in: ${item.title}`);
    assert.ok(item.title.includes('Breast cancer & screening'), item.title);
    assert.ok(item.title.length <= 300);
  }
});

test('results are cached: a second request does not go back to PubMed', async () => {
  const u = await signUp();
  await join(u, 'asthma');
  await api('GET', '/research?kind=research', { token: u.token });
  const after1 = calls.length;
  assert.ok(after1 >= 2);
  await api('GET', '/research?kind=research', { token: u.token });
  const other = await signUp();
  await join(other, 'asthma');
  await api('GET', '/research?kind=research', { token: other.token });
  assert.equal(calls.length, after1, 'cached for everyone interested in the same community');
});

test('a stale feed keeps serving its old items while refreshing in the background', async () => {
  const u = await signUp();
  await join(u, 'copd');
  await api('GET', '/research?kind=research', { token: u.token });
  await mongoose.model('ResearchFeed').updateOne({ group: 'copd', kind: 'research' }, { $set: { refreshedAt: new Date(Date.now() - 3 * 86400000) } });
  const before = calls.length;
  const r = await api('GET', '/research?kind=research', { token: u.token });
  assert.ok(r.body.items.length >= 1, 'stale items are still shown immediately');
  await new Promise((res) => setTimeout(res, 100));
  assert.ok(calls.length > before, 'and a refresh was started');
});

test('when PubMed is down the site keeps working, and retries are backed off rather than hammered', async () => {
  mode = 'down';
  const u = await signUp();
  await join(u, 'thyroid');
  const r = await api('GET', '/research?kind=research', { token: u.token });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items, []);
  const failedCalls = calls.length;
  assert.ok(failedCalls >= 1);
  const feed = await mongoose.model('ResearchFeed').findOne({ group: 'thyroid', kind: 'research' }).lean();
  assert.ok(feed.retryAfter > new Date(), 'a retry time is recorded');
  assert.ok(!feed.lastError.includes('<'), 'stored error text is plain');

  for (let i = 0; i < 3; i++) await api('GET', '/research?kind=research', { token: u.token });
  assert.equal(calls.length, failedCalls, 'no further attempts during the back-off window');

  mode = 'ok';
  await mongoose.model('ResearchFeed').updateOne({ group: 'thyroid', kind: 'research' }, { $set: { retryAfter: new Date(Date.now() - 1000) } });
  const later = await api('GET', '/research?kind=research', { token: u.token });
  assert.ok(later.body.items.length >= 1, 'recovers once the window passes');
});

test('members with no communities get a general feed, flagged as not personalised', async () => {
  const u = await signUp();
  const r = await api('GET', '/research?kind=research', { token: u.token });
  assert.equal(r.body.personalized, false);
  assert.ok(r.body.items.every((i) => ['chronic-pain', 'chronic-illness-life'].includes(i.group.slug)));
});

test('the tests feed and research feed are separate, and a member only sees their own communities', async () => {
  const a = await signUp();
  const b = await signUp();
  await join(a, 'lupus');
  await join(b, 'epilepsy');
  await api('GET', '/research?kind=research', { token: a.token });
  await api('GET', '/research?kind=tests', { token: a.token });
  await api('GET', '/research?kind=research', { token: b.token });
  const t = await api('GET', '/research?kind=tests', { token: a.token });
  assert.ok(t.body.items.every((i) => i.group.slug === 'lupus'));
  const decoded = calls.map((c) => decodeURIComponent(c).replace(/\+/g, ' '));
  assert.ok(decoded.some((c) => c.includes('diagnos*[ti]')), 'tests feed searches for diagnostics');
  assert.ok(decoded.some((c) => c.includes('Randomized Controlled Trial[pt]')), 'research feed searches for studies');
  const other = await api('GET', '/research?kind=research&group=lupus', { token: b.token });
  assert.equal(other.status, 200, 'anyone can browse a community feed by name');
});

test('limit is clamped and a single community cannot flood the list', async () => {
  const u = await signUp();
  await join(u, 'ibd');
  const many = await api('GET', '/research?kind=research&limit=999', { token: u.token });
  assert.ok(many.body.items.length <= 3, 'at most 3 per community');
  assert.equal((await api('GET', '/research?kind=research&limit=abc', { token: u.token })).status, 200);
});

test('a paper indexed under several of your communities is listed once', async () => {
  const u = await signUp();
  await join(u, 'asthma', 'copd', 'lung-cancer'); // the fake PubMed returns the same papers for every community
  const r = await api('GET', '/research?kind=research&limit=20', { token: u.token });
  const pmids = r.body.items.map((i) => i.pmid);
  assert.ok(pmids.length >= 1);
  assert.equal(new Set(pmids).size, pmids.length, `duplicates in ${pmids}`);
});

test('a changed community definition makes its feed refresh even if it was fetched recently', async () => {
  const u = await signUp();
  await join(u, 'thyroid');
  await api('GET', '/research?kind=research', { token: u.token });
  const first = calls.length;
  await api('GET', '/research?kind=research', { token: u.token });
  assert.equal(calls.length, first, 'unchanged and fresh: served from cache');
  await mongoose.model('ResearchFeed').updateOne({ group: 'thyroid', kind: 'research' }, { $set: { queryHash: 'an-older-search' } });
  await api('GET', '/research?kind=research', { token: u.token });
  assert.ok(calls.length > first, 'a different stored search triggers a refresh');
});

test('exact-heading communities do not expand into every disease beneath them', () => {
  const { getGroup } = require('../lib/groups');
  assert.match(pubmed.buildQuery(getGroup('chronic-illness-life'), 'research'), /"Chronic Disease"\[Majr:NoExp\]/);
  assert.match(pubmed.buildQuery(getGroup('ibs'), 'research'), /"Irritable Bowel Syndrome"\[Majr\]/);
});

test('unit: cleanText and parseSummary', () => {
  assert.equal(pubmed.cleanText('<b>Bold</b> &amp; <script>x</script>  spaced\n\ttext', 100), 'Bold & x spaced text');
  assert.equal(pubmed.cleanText('x'.repeat(500), 300).length, 300);
  assert.equal(pubmed.cleanText(null, 10), '');
  assert.deepEqual(pubmed.parseSummary(null), []);
  assert.deepEqual(pubmed.parseSummary({ result: { uids: ['1'], 1: { title: '   ' } } }), [], 'blank titles are skipped');
  assert.deepEqual(pubmed.parseSummary({ result: { uids: ['abc'], abc: { title: 'x' } } }), [], 'non-numeric ids are skipped');
});
