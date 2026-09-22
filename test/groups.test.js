process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { GROUPS, CATEGORIES, MAX_MEMBERSHIPS } = require('../lib/groups');
const { buildQuery } = require('../lib/pubmed');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const thread = (over = {}) => ({
  title: 'Looking for others who have been through this',
  body: 'I was diagnosed recently and would love to hear how others coped with the first few weeks.',
  ...over,
});

test('catalogue integrity: unique slugs, valid categories, real search topics', () => {
  assert.equal(new Set(GROUPS.map((g) => g.slug)).size, GROUPS.length);
  const cats = new Set(CATEGORIES.map((c) => c.slug));
  for (const g of GROUPS) {
    assert.match(g.slug, /^[a-z0-9-]+$/, g.slug);
    assert.ok(cats.has(g.category), `${g.slug} has an unknown category`);
    assert.ok(g.name && g.blurb, g.slug);
    assert.ok(g.mesh.length >= 1 && g.title.length >= 1, `${g.slug} needs mesh headings and title phrases`);
  }
  for (const c of CATEGORIES) assert.ok(GROUPS.some((g) => g.category === c.slug), `category ${c.slug} is empty`);
  for (const wanted of ['breast-cancer', 'ibs', 'colorectal-cancer']) assert.ok(GROUPS.some((g) => g.slug === wanted));
});

test('search queries are well-formed for every community and both feeds', () => {
  for (const g of GROUPS) {
    for (const kind of ['research', 'tests']) {
      const q = buildQuery(g, kind);
      let depth = 0;
      for (const ch of q) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        assert.ok(depth >= 0, `unbalanced in ${g.slug}/${kind}`);
      }
      assert.equal(depth, 0, `unbalanced in ${g.slug}/${kind}`);
      assert.ok(q.includes(`"${g.mesh[0]}"[Majr`), 'searches the official subject heading');
      assert.ok(q.includes('NOT ('), 'lab-chemistry noise is excluded');
    }
  }
});

test('the community list requires sign-in and groups communities by category', async () => {
  assert.equal((await api('GET', '/groups')).status, 401);
  const u = await signUp();
  const r = await api('GET', '/groups', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.categories.length, CATEGORIES.length);
  assert.equal(r.body.categories.flatMap((c) => c.groups).length, GROUPS.length);
  const cancer = r.body.categories.find((c) => c.slug === 'cancer');
  assert.ok(cancer.groups.some((g) => g.slug === 'breast-cancer'));
  assert.ok(r.body.categories.flatMap((c) => c.groups).every((g) => g.joined === false));
});

test('joining and leaving is idempotent and only affects you', async () => {
  const a = await signUp();
  const b = await signUp();
  assert.equal((await api('POST', '/groups/ibs/join', { token: a.token })).status, 200);
  assert.equal((await api('POST', '/groups/ibs/join', { token: a.token })).status, 200, 'joining twice is fine');
  assert.equal(await mongoose.model('Membership').countDocuments({ userId: a.id, group: 'ibs' }), 1);
  assert.deepEqual((await api('GET', '/groups/mine', { token: a.token })).body.groups, ['ibs']);
  assert.deepEqual((await api('GET', '/groups/mine', { token: b.token })).body.groups, [], "another member's communities are never visible");
  assert.equal((await api('GET', '/groups/ibs', { token: a.token })).body.group.joined, true);
  assert.equal((await api('GET', '/groups/ibs', { token: b.token })).body.group.joined, false);
  assert.equal((await api('DELETE', '/groups/ibs/join', { token: a.token })).status, 200);
  assert.equal((await api('DELETE', '/groups/ibs/join', { token: a.token })).status, 200, 'leaving twice is fine');
  assert.deepEqual((await api('GET', '/groups/mine', { token: a.token })).body.groups, []);
});

test('unknown communities are a 404, and there is a cap on how many you can join', async () => {
  const u = await signUp();
  for (const slug of ['nope', 'IBS', '..%2Fadmin', '%24ne']) {
    assert.equal((await api('POST', `/groups/${slug}/join`, { token: u.token })).status, 404, slug);
  }
  assert.equal((await api('GET', '/groups/nope', { token: u.token })).status, 404);
  for (const g of GROUPS.slice(0, MAX_MEMBERSHIPS)) assert.equal((await api('POST', `/groups/${g.slug}/join`, { token: u.token })).status, 200);
  const over = await api('POST', `/groups/${GROUPS[MAX_MEMBERSHIPS].slug}/join`, { token: u.token });
  assert.equal(over.status, 400);
  assert.match(over.body.message, /up to 20/);
  assert.equal((await api('POST', `/groups/${GROUPS[0].slug}/join`, { token: u.token })).status, 200, 'rejoining one you already have still works');
});

test('member counts are withheld until there are enough members to be anonymous', async () => {
  const members = [];
  for (let i = 0; i < 3; i++) members.push(await signUp());
  const viewer = await signUp();
  const count = async () => (await api('GET', '/groups/pcos', { token: viewer.token })).body.group.members;

  await api('POST', '/groups/pcos/join', { token: members[0].token });
  await api('POST', '/groups/pcos/join', { token: members[1].token });
  assert.equal(await count(), null, 'two members: must not be shown');
  const list = (await api('GET', '/groups', { token: viewer.token })).body.categories.flatMap((c) => c.groups).find((g) => g.slug === 'pcos');
  assert.equal(list.members, null);
  await api('POST', '/groups/pcos/join', { token: members[2].token });
  assert.equal(await count(), 3);
  const raw = JSON.stringify((await api('GET', '/groups', { token: viewer.token })).body);
  for (const m of members) assert.ok(!raw.includes(m.handle) && !raw.includes(m.id), 'no member identity in the community list');
});

test('posting in a community requires membership; the thread carries its community', async () => {
  const u = await signUp();
  const other = await signUp();
  const denied = await api('POST', '/community/threads', { token: u.token, body: thread({ group: 'breast-cancer' }) });
  assert.equal(denied.status, 403);
  assert.match(denied.body.message, /Join Breast Cancer/);
  assert.equal((await api('POST', '/community/threads', { token: u.token, body: thread({ group: 'not-a-group' }) })).status, 400);
  assert.equal((await api('POST', '/community/threads', { token: u.token, body: thread({ group: { $ne: 'x' } }) })).status, 400);

  await api('POST', '/groups/breast-cancer/join', { token: u.token });
  const ok = await api('POST', '/community/threads', { token: u.token, body: thread({ group: 'breast-cancer' }) });
  assert.equal(ok.status, 201);
  assert.deepEqual(ok.body.thread.group, { slug: 'breast-cancer', name: 'Breast Cancer' });
  // anyone can read it, but reading needs no membership and reveals nothing about who has joined
  const seen = await api('GET', `/community/threads/${ok.body.thread.id}`, { token: other.token });
  assert.equal(seen.status, 200);
  assert.deepEqual(seen.body.thread.group, { slug: 'breast-cancer', name: 'Breast Cancer' });
  // the general board still works without a community
  assert.equal((await api('POST', '/community/threads', { token: other.token, body: thread() })).body.thread.group, null);
});

test('filtering threads by community, and "my communities"', async () => {
  const a = await signUp();
  const b = await signUp();
  await api('POST', '/groups/asthma/join', { token: a.token });
  await api('POST', '/groups/copd/join', { token: b.token });
  await api('POST', '/community/threads', { token: a.token, body: thread({ title: 'Asthma thread for the filter test', group: 'asthma' }) });
  await api('POST', '/community/threads', { token: b.token, body: thread({ title: 'COPD thread for the filter test', group: 'copd' }) });
  await api('POST', '/community/threads', { token: b.token, body: thread({ title: 'General thread for the filter test' }) });

  const asthma = await api('GET', '/community/threads?group=asthma', { token: b.token });
  assert.deepEqual(asthma.body.threads.map((t) => t.title), ['Asthma thread for the filter test']);
  const mineA = await api('GET', '/community/threads?mine=1', { token: a.token });
  assert.ok(mineA.body.threads.length >= 1 && mineA.body.threads.every((t) => t.group?.slug === 'asthma'), 'only threads from communities I joined');
  const nobody = await signUp();
  assert.deepEqual((await api('GET', '/community/threads?mine=1', { token: nobody.token })).body.threads, []);
  assert.equal((await api('GET', '/community/threads?group=nope', { token: a.token })).status, 400);
  assert.equal((await api('GET', '/community/threads?group[$ne]=asthma', { token: a.token })).status, 400);
});

test('memberships are private: not in profiles, included in your export, erased on deletion', async () => {
  const me = await signUp({ handle: 'private_joiner' });
  const viewer = await signUp();
  await api('POST', '/groups/lupus/join', { token: me.token });
  const profile = await api('GET', '/community/users/private_joiner', { token: viewer.token });
  assert.ok(!JSON.stringify(profile.body).includes('lupus'), "a member's communities must not appear on their public profile");
  const exported = await api('GET', '/account/export', { token: me.token });
  assert.deepEqual(exported.body.communities.map((c) => c.community), ['lupus']);
  assert.equal((await api('DELETE', '/account', { token: me.token, body: { password: me.password } })).status, 200);
  assert.equal(await mongoose.model('Membership').countDocuments({ userId: me.id }), 0);
});
