process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { startTestApp, stopTestApp, api, signUp, setRole } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const thread = (over = {}) => ({
  title: 'Sharp pain in my right shoulder',
  body: 'It started after a workout and gets worse when I reach overhead. Anyone else?',
  painTypes: ['sharp'],
  region: { partId: 'FJ100', partName: 'Right deltoid', system: 'muscular', side: 'right' },
  ...over,
});
const mkThread = async (u, over) => (await api('POST', '/community/threads', { token: u.token, body: thread(over) })).body.thread;

const painEntry = (over = {}) => ({
  location: { partId: 'FJ100', partName: 'Right deltoid', system: 'muscular', side: 'right', point: [-0.2, 1.4, 0.02] },
  painTypes: ['sharp', 'burning'],
  severity: 6,
  onset: new Date(Date.now() - 5 * 86400000).toISOString(),
  pattern: 'constant',
  triggers: ['Movement'],
  notes: 'SECRET NOTE: my phone is private',
  visibility: 'community',
  ...over,
});
const mkPain = async (u, over) => (await api('POST', '/pain', { token: u.token, body: painEntry(over) })).body.entry;
// Tests share one database, so each matching test works in its own patch of the body.
const inRegion = (partId, point, over = {}) => ({
  location: { partId, partName: `Region ${partId}`, system: 'muscular', side: 'right', point },
  ...over,
});

// ------------------------------------------------------------------ threads

test('community routes require a signed-in member', async () => {
  for (const [m, p] of [['GET', '/community/threads'], ['POST', '/community/threads'], ['GET', '/community/matches'], ['GET', '/mod/reports'], ['GET', '/account/export']]) {
    assert.equal((await api(m, p)).status, 401, `${m} ${p}`);
  }
});

test('creating and reading a thread never exposes the author\'s real identity', async () => {
  const alice = await signUp({ handle: 'alice_w' });
  const bob = await signUp();
  const created = await api('POST', '/community/threads', { token: alice.token, body: thread() });
  assert.equal(created.status, 201);
  assert.equal(created.body.crisis, false);
  const id = created.body.thread.id;

  const detail = await api('GET', `/community/threads/${id}`, { token: bob.token });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.thread.author.handle, 'alice_w');
  assert.equal(detail.body.thread.isMine, false);
  const raw = JSON.stringify(detail.body);
  assert.ok(!raw.includes(alice.email), 'email must not appear');
  assert.ok(!raw.includes('Test Person'), 'real name must not appear');
  assert.ok(!raw.includes(alice.id), 'internal user id must not appear');
});

test('thread validation: title/body length, region, pain types', async () => {
  const u = await signUp();
  for (const bad of [
    thread({ title: 'hi' }),
    thread({ title: 'x'.repeat(141) }),
    thread({ body: 'short' }),
    thread({ body: 'y'.repeat(5001) }),
    thread({ painTypes: ['bogus'] }),
    thread({ painTypes: ['sharp', 'dull', 'aching', 'burning', 'throbbing', 'cramping'] }),
    thread({ region: 'shoulder' }),
    thread({ region: { side: 'left' } }),
    thread({ region: { partId: 'x', side: 'sideways' } }),
    thread({ title: { $ne: 1 } }),
  ]) {
    const r = await api('POST', '/community/threads', { token: u.token, body: bad });
    assert.ok([400, 422].includes(r.status), `${JSON.stringify(bad).slice(0, 70)} -> ${r.status}`);
  }
});

test('contact details and links are rejected with a clear reason', async () => {
  const u = await signUp();
  for (const body of [
    'Please email me at someone@example.com to chat about it',
    'You can call me on 555-123-4567 any time about this',
    'Look at https://example.com/my-page for details of it',
  ]) {
    const r = await api('POST', '/community/threads', { token: u.token, body: thread({ body }) });
    assert.equal(r.status, 422, body);
    assert.ok(r.body.problems.length >= 1);
  }
  const ok = await api('POST', '/community/threads', { token: u.token, body: thread({ body: 'My HbA1c was 6.9 and BP 140/90 in 2026, taking 400mg twice a day.' }) });
  assert.equal(ok.status, 201);
});

test('markup in posts is stored as plain text, never interpreted', async () => {
  const u = await signUp();
  const t = await mkThread(u, { title: '<script>alert(1)</script> hello', body: '<img src=x onerror=alert(1)> this is my long body text' });
  const got = await api('GET', `/community/threads/${t.id}`, { token: u.token });
  assert.equal(got.body.thread.title, '<script>alert(1)</script> hello'); // returned literally; the UI renders text nodes only
});

test('browse filters: region, type, search, sort, paging', async () => {
  const u = await signUp();
  const v = await signUp();
  await mkThread(u, { title: 'Knee pain when climbing stairs', region: { partId: 'FJ200', partName: 'Right knee', system: 'skeletal' }, painTypes: ['aching'], body: 'My knee aches badly on stairs, any advice welcome please.' });
  await mkThread(u, { title: 'Shoulder pain at night keeps me awake', painTypes: ['throbbing'], body: 'Shoulder throbs when I lie down at night, has anyone found relief.' });
  const byPart = await api('GET', '/community/threads?partId=FJ200', { token: v.token });
  assert.equal(byPart.body.threads.length, 1);
  assert.match(byPart.body.threads[0].title, /Knee/);
  const bySystem = await api('GET', '/community/threads?system=muscular', { token: v.token });
  assert.ok(bySystem.body.threads.every((t) => t.region.system === 'muscular'));
  const byType = await api('GET', '/community/threads?type=aching', { token: v.token });
  assert.equal(byType.body.threads.length, 1);
  const search = await api('GET', '/community/threads?q=stairs', { token: v.token });
  assert.equal(search.body.threads.length, 1);
  assert.equal((await api('GET', '/community/threads?type=bogus', { token: v.token })).status, 400);
  assert.equal((await api('GET', '/community/threads?system[$ne]=x', { token: v.token })).status, 400);
  const page = await api('GET', '/community/threads?limit=1&page=1', { token: v.token });
  assert.equal(page.body.threads.length, 1);
  assert.equal(page.body.hasMore, true);
});

test('replies: post, count, list; support toggles once per member and not on own posts', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const t = await mkThread(alice);
  const r = await api('POST', `/community/threads/${t.id}/replies`, { token: bob.token, body: { body: 'I had the same thing, physio helped me a lot.' } });
  assert.equal(r.status, 201);
  const detail = await api('GET', `/community/threads/${t.id}`, { token: alice.token });
  assert.equal(detail.body.thread.replyCount, 1);
  assert.equal(detail.body.replies.length, 1);
  assert.equal(detail.body.replies[0].author.handle, bob.handle);

  const on = await api('POST', `/community/threads/${t.id}/support`, { token: bob.token });
  assert.deepEqual([on.body.supported, on.body.supportCount], [true, 1]);
  const off = await api('POST', `/community/threads/${t.id}/support`, { token: bob.token });
  assert.deepEqual([off.body.supported, off.body.supportCount], [false, 0]);
  assert.equal((await api('POST', `/community/threads/${t.id}/support`, { token: alice.token })).status, 400);
  const rs = await api('POST', `/community/replies/${r.body.reply.id}/support`, { token: alice.token });
  assert.equal(rs.body.supportCount, 1);
});

test('only the author can edit or delete; deleted threads vanish and erase their text', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const t = await mkThread(alice);
  assert.equal((await api('PUT', `/community/threads/${t.id}`, { token: bob.token, body: { title: 'hijacked title here' } })).status, 404);
  assert.equal((await api('DELETE', `/community/threads/${t.id}`, { token: bob.token })).status, 404);
  const edit = await api('PUT', `/community/threads/${t.id}`, { token: alice.token, body: { title: 'Updated title for my thread' } });
  assert.equal(edit.status, 200);
  assert.ok(edit.body.thread.editedAt);
  assert.equal((await api('DELETE', `/community/threads/${t.id}`, { token: alice.token })).status, 200);
  assert.equal((await api('GET', `/community/threads/${t.id}`, { token: bob.token })).status, 404);
  const stored = await mongoose.model('Thread').findById(t.id).lean();
  assert.equal(stored.body, '', 'text must be erased, not just flagged');
  assert.equal(stored.removedBy, 'author');
  assert.equal((await api('POST', `/community/threads/${t.id}/replies`, { token: bob.token, body: { body: 'anyone home?' } })).status, 404);
});

test('crisis language: post succeeds, response flags it, moderators get a system report', async () => {
  const u = await signUp();
  const r = await api('POST', '/community/threads', { token: u.token, body: thread({ title: 'I do not know how to cope', body: 'The pain never stops and honestly I want to die some days.' }) });
  assert.equal(r.status, 201);
  assert.equal(r.body.crisis, true);
  const reports = await mongoose.model('Report').find({ targetId: r.body.thread.id }).lean();
  assert.equal(reports.length, 1);
  assert.equal(reports[0].source, 'system');
  assert.equal(reports[0].reason, 'self-harm');
});

// ----------------------------------------------------------------- blocking

test('blocking hides a member\'s threads, replies and matches from the blocker only', async () => {
  const alice = await signUp();
  const bob = await signUp({ handle: 'bob_blocked' });
  const carol = await signUp();
  const t = await mkThread(bob);
  await api('POST', `/community/threads/${(await mkThread(carol)).id}/replies`, { token: bob.token, body: { body: 'reply from bob here' } });

  assert.equal((await api('POST', '/community/blocks/bob_blocked', { token: alice.token })).status, 200);
  const aliceList = await api('GET', '/community/threads', { token: alice.token });
  assert.ok(!aliceList.body.threads.some((x) => x.id === t.id));
  const carolList = await api('GET', '/community/threads', { token: carol.token });
  assert.ok(carolList.body.threads.some((x) => x.id === t.id), 'others still see it');
  assert.deepEqual((await api('GET', '/community/blocks', { token: alice.token })).body.blocked, ['bob_blocked']);
  assert.equal((await api('POST', `/community/blocks/${alice.handle}`, { token: alice.token })).status, 400);
  await api('DELETE', '/community/blocks/bob_blocked', { token: alice.token });
  assert.ok((await api('GET', '/community/threads', { token: alice.token })).body.threads.some((x) => x.id === t.id));
});

// ------------------------------------------------------------------ matching

test('matching never reveals private entries, notes, exact points, identity or exact dates', async () => {
  const me = await signUp();
  const shared = await signUp({ handle: 'shares_openly' });
  const hidden = await signUp({ handle: 'keeps_private' });
  const spot = (over = {}) => inRegion('FJ310', [-0.2, 1.4, 0.02], over);
  const mine = await mkPain(me, spot({ visibility: 'private' }));
  await mkPain(shared, spot());
  await mkPain(hidden, spot({ visibility: 'private' }));

  const r = await api('GET', `/community/matches?entryId=${mine._id}`, { token: me.token });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.matches.map((m) => m.handle), ['shares_openly']);
  const m = r.body.matches[0];
  assert.equal(m.band, 'very-similar');
  assert.equal(m.sameStructure, true);
  assert.deepEqual(m.commonTypes.sort(), ['burning', 'sharp']);
  assert.equal(m.entry.duration, 'a few days to two weeks');

  const raw = JSON.stringify(r.body);
  for (const secret of ['SECRET NOTE', 'point', 'onset', shared.email, shared.id, 'Test Person', '"notes"', 'triggers']) {
    assert.ok(!raw.includes(secret), `response must not contain ${secret}`);
  }
});

test('matching: unrelated body regions do not match; own and blocked members are excluded; resolved entries are ignored', async () => {
  const me = await signUp();
  const far = await signUp();
  const blocked = await signUp({ handle: 'blocked_match' });
  const resolved = await signUp();
  const here = (over = {}) => inRegion('FJ320', [0.15, 1.0, -0.05], over);
  const mine = await mkPain(me, here());
  await mkPain(far, { location: { partId: 'FJ900', partName: 'Left calf', system: 'muscular', side: 'left', point: [0.1, 0.4, -0.02] } });
  await mkPain(blocked, here());
  const gone = await mkPain(resolved, here());
  await api('PUT', `/pain/${gone._id}`, { token: resolved.token, body: { status: 'resolved' } });
  await mkPain(me, here({ severity: 2 })); // my own other entry must not match me

  await api('POST', '/community/blocks/blocked_match', { token: me.token });
  const r = await api('GET', `/community/matches?entryId=${mine._id}`, { token: me.token });
  assert.deepEqual(r.body.matches, []);
});

test('matching: other members\' entry ids are not usable, and bad ids are rejected', async () => {
  const a = await signUp();
  const b = await signUp();
  const theirs = await mkPain(b, inRegion('FJ330', [-0.05, 0.6, 0.1]));
  assert.equal((await api('GET', `/community/matches?entryId=${theirs._id}`, { token: a.token })).status, 404);
  assert.equal((await api('GET', '/community/matches?entryId=nope', { token: a.token })).status, 400);
  assert.equal((await api('GET', '/community/matches', { token: a.token })).status, 400);
});

test('region summary hides small counts (k-anonymity) and shows real ones', async () => {
  const me = await signUp();
  const region = { partId: 'FJ777', partName: 'Right hip', system: 'skeletal', side: 'right', point: [-0.1, 0.9, 0] };
  const members = [];
  for (let i = 0; i < 3; i++) members.push(await signUp());
  await mkPain(members[0], { location: region });
  await mkPain(members[1], { location: region });

  let s = await api('GET', '/community/regions/summary?partId=FJ777', { token: me.token });
  assert.equal(s.body.members, null);
  assert.equal(s.body.membersHidden, true);

  await mkPain(members[2], { location: region });
  s = await api('GET', '/community/regions/summary?partId=FJ777', { token: me.token });
  assert.equal(s.body.members, 3);
  assert.equal(s.body.membersHidden, false);

  await mkPain(members[2], { location: region }); // second entry, same member: still 3 people
  s = await api('GET', '/community/regions/summary?partId=FJ777', { token: me.token });
  assert.equal(s.body.members, 3);
  assert.equal((await api('GET', '/community/regions/summary', { token: me.token })).status, 400);
});

// ----------------------------------------------------------------- profiles

test('public profile shows only handle, bio and activity counts', async () => {
  const u = await signUp({ handle: 'profile_pat' });
  const v = await signUp();
  await api('PUT', '/users/profile', { token: u.token, body: { bio: 'Living with chronic back pain.', phone: '555 0101', gender: 'Other' } });
  const r = await api('GET', '/community/users/profile_pat', { token: v.token });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body.profile).sort(), ['bio', 'blocked', 'friendship', 'handle', 'isMe', 'joined', 'replyCount', 'role', 'threadCount']);
  assert.equal(r.body.profile.friendship, 'none');
  const raw = JSON.stringify(r.body);
  assert.ok(!raw.includes(u.email) && !raw.includes('555') && !raw.includes('Test Person'));
  assert.equal((await api('GET', '/community/users/no_such_person', { token: v.token })).status, 404);
});

// ---------------------------------------------------------------- moderation

async function reportedThread() {
  const author = await signUp();
  const reporter = await signUp();
  const t = await mkThread(author);
  const rep = await api('POST', '/community/reports', { token: reporter.token, body: { targetType: 'thread', targetId: t.id, reason: 'spam', details: 'looks like an ad' } });
  assert.equal(rep.status, 201);
  return { author, reporter, t };
}

test('reports: validation, no self-reports, duplicates are harmless', async () => {
  const { reporter, author, t } = await reportedThread();
  assert.equal((await api('POST', '/community/reports', { token: reporter.token, body: { targetType: 'thread', targetId: t.id, reason: 'spam' } })).status, 201);
  assert.equal(await mongoose.model('Report').countDocuments({ targetId: t.id, reporterId: reporter.id }), 1, 'one report per member per item');
  assert.equal((await api('POST', '/community/reports', { token: author.token, body: { targetType: 'thread', targetId: t.id, reason: 'spam' } })).status, 400);
  assert.equal((await api('POST', '/community/reports', { token: reporter.token, body: { targetType: 'thread', targetId: t.id, reason: 'because' } })).status, 400);
  assert.equal((await api('POST', '/community/reports', { token: reporter.token, body: { targetType: 'thread', targetId: 'abc', reason: 'spam' } })).status, 400);
  assert.equal((await api('POST', '/community/reports', { token: reporter.token, body: { targetType: 'nope', targetId: t.id, reason: 'spam' } })).status, 400);
});

test('members cannot use moderation endpoints', async () => {
  const u = await signUp();
  for (const [m, p] of [['GET', '/mod/reports'], ['GET', '/mod/actions'], ['POST', '/mod/users/anyone/suspend'], ['POST', '/mod/users/anyone/role']]) {
    assert.equal((await api(m, p, { token: u.token, ...(m === 'POST' ? { body: {} } : {}) })).status, 403, `${m} ${p}`);
  }
});

test('moderator can review, hide, restore and remove; every decision is audited', async () => {
  const mod = await signUp();
  await setRole(mod.id, 'moderator');
  const { t } = await reportedThread();
  const queue = await api('GET', '/mod/reports', { token: mod.token });
  const item = queue.body.reports.find((r) => String(r.target?.id) === t.id);
  assert.ok(item);
  assert.equal(item.target.type, 'thread');
  assert.ok(!JSON.stringify(item).includes('@example.com'), 'moderators do not see contact details');

  assert.equal((await api('POST', `/mod/reports/${item.id}/resolve`, { token: mod.token, body: { action: 'hide', note: 'pending review' } })).status, 200);
  const viewer = await signUp();
  assert.equal((await api('GET', `/community/threads/${t.id}`, { token: viewer.token })).status, 404, 'hidden from members');
  assert.equal((await api('GET', `/community/threads/${t.id}`, { token: mod.token })).status, 200, 'still visible to moderators');
  assert.equal((await api('POST', `/mod/reports/${item.id}/resolve`, { token: mod.token, body: { action: 'dismiss' } })).status, 409, 'cannot resolve twice');

  assert.equal((await api('POST', `/mod/content/thread/${t.id}/restore`, { token: mod.token })).status, 200);
  assert.equal((await api('GET', `/community/threads/${t.id}`, { token: viewer.token })).status, 200);

  const actions = await api('GET', '/mod/actions', { token: mod.token });
  assert.ok(actions.body.actions.some((a) => a.action === 'hide' && a.note === 'pending review'));
  assert.ok(actions.body.actions.some((a) => a.action === 'restore'));
});

test('removing content erases its text; reply counts stay accurate', async () => {
  const mod = await signUp();
  await setRole(mod.id, 'moderator');
  const author = await signUp();
  const other = await signUp();
  const t = await mkThread(author);
  const reply = (await api('POST', `/community/threads/${t.id}/replies`, { token: other.token, body: { body: 'this reply is abusive rubbish' } })).body.reply;
  await api('POST', '/community/reports', { token: author.token, body: { targetType: 'reply', targetId: reply.id, reason: 'harassment' } });
  const item = (await api('GET', '/mod/reports', { token: mod.token })).body.reports.find((r) => String(r.target?.id) === reply.id);
  assert.equal((await api('POST', `/mod/reports/${item.id}/resolve`, { token: mod.token, body: { action: 'remove' } })).status, 200);
  const detail = await api('GET', `/community/threads/${t.id}`, { token: author.token });
  assert.equal(detail.body.thread.replyCount, 0);
  assert.equal(detail.body.replies[0].body, '');
  assert.equal((await mongoose.model('Reply').findById(reply.id).lean()).body, '');
});

test('suspending an author blocks posting but not reading, and can be lifted', async () => {
  const mod = await signUp();
  await setRole(mod.id, 'moderator');
  const { author, t } = await reportedThread();
  const item = (await api('GET', '/mod/reports', { token: mod.token })).body.reports.find((r) => String(r.target?.id) === t.id);
  const res = await api('POST', `/mod/reports/${item.id}/resolve`, { token: mod.token, body: { action: 'suspend_author', days: 7, note: 'spam' } });
  assert.equal(res.status, 200);

  assert.equal((await api('POST', '/community/threads', { token: author.token, body: thread() })).status, 403);
  assert.equal((await api('POST', `/community/threads/${t.id}/replies`, { token: author.token, body: { body: 'hello?' } })).status, 403);
  assert.equal((await api('GET', '/community/threads', { token: author.token })).status, 200, 'can still read');

  assert.equal((await api('POST', `/mod/users/${author.handle}/unsuspend`, { token: mod.token })).status, 200);
  assert.equal((await api('POST', '/community/threads', { token: author.token, body: thread() })).status, 201);
});

test('rank rules: moderators cannot act on admins or peers; only admins change roles; no self-promotion', async () => {
  const admin = await signUp();
  await setRole(admin.id, 'admin');
  const mod = await signUp();
  await setRole(mod.id, 'moderator');
  const mod2 = await signUp();
  await setRole(mod2.id, 'moderator');
  const user = await signUp();

  const susp = (token, handle) => api('POST', `/mod/users/${handle}/suspend`, { token, body: { reason: 'testing rank rules', days: 1 } });
  assert.equal((await susp(mod.token, admin.handle)).status, 403);
  assert.equal((await susp(mod.token, mod2.handle)).status, 403);
  assert.equal((await susp(mod.token, user.handle)).status, 200);
  assert.equal((await susp(admin.token, mod.handle)).status, 200);

  assert.equal((await api('POST', `/mod/users/${user.handle}/role`, { token: mod2.token, body: { role: 'moderator' } })).status, 403);
  assert.equal((await api('POST', `/mod/users/${mod2.handle}/role`, { token: mod2.token, body: { role: 'admin' } })).status, 403);
  assert.equal((await api('POST', `/mod/users/${admin.handle}/role`, { token: admin.token, body: { role: 'user' } })).status, 400, 'no self-change');
  assert.equal((await api('POST', `/mod/users/${user.handle}/role`, { token: admin.token, body: { role: 'moderator' } })).status, 200);
  assert.equal((await api('POST', `/mod/users/${user.handle}/role`, { token: admin.token, body: { role: 'emperor' } })).status, 400);
});

// ------------------------------------------------------------------ account

test('export contains the member\'s own data and nothing about others', async () => {
  const me = await signUp();
  const other = await signUp();
  await mkPain(me);
  await mkPain(other, { notes: 'OTHER PERSON NOTE' });
  await mkThread(me);
  await api('POST', '/reports', { token: me.token, body: { testName: 'CBC', testDate: '2026-01-01', testType: 'Blood', results: { glucose: '90' } } });
  const r = await api('GET', '/account/export', { token: me.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.painEntries.length, 1);
  assert.equal(r.body.threads.length, 1);
  assert.equal(r.body.testReports.length, 1);
  assert.equal(r.body.account.email, me.email);
  assert.equal(r.body.account.password, undefined);
  assert.ok(!JSON.stringify(r.body).includes('OTHER PERSON NOTE'));
});

test('deleting an account requires the password, then erases data and locks the account', async () => {
  const me = await signUp({ handle: 'leaving_soon' });
  const other = await signUp();
  const pain = await mkPain(me);
  const t = await mkThread(me);
  const reply = (await api('POST', `/community/threads/${(await mkThread(other)).id}/replies`, { token: me.token, body: { body: 'a reply I will delete' } })).body.reply;
  await api('POST', '/reports', { token: me.token, body: { testName: 'CBC', testDate: '2026-01-01', testType: 'Blood', results: { a: '1' } } });

  assert.equal((await api('DELETE', '/account', { token: me.token, body: { password: 'wrong-password-1' } })).status, 403);
  assert.equal((await api('DELETE', '/account', { token: me.token, body: {} })).status, 403);
  assert.equal((await api('DELETE', '/account', { token: me.token, body: { password: me.password } })).status, 200);

  assert.equal((await api('GET', '/auth/me', { token: me.token })).status, 401, 'session dies immediately');
  assert.equal((await api('POST', '/auth/login', { body: { email: me.email, password: me.password } })).status, 401);
  assert.equal(await mongoose.model('PainEntry').countDocuments({ _id: pain._id }), 0);
  assert.equal(await mongoose.model('TestReport').countDocuments({ userId: me.id }), 0);
  assert.equal((await mongoose.model('Thread').findById(t.id).lean()).body, '');
  assert.equal((await mongoose.model('Reply').findById(reply.id).lean()).body, '');
  const tomb = await mongoose.model('User').findById(me.id).lean();
  assert.equal(tomb.status, 'deleted');
  assert.ok(!tomb.email.includes(me.email) && tomb.name === '[deleted]' && !tomb.handle.includes('leaving'));
  // the username becomes available again
  await signUp({ handle: 'leaving_soon' });
  // and the deleted member is invisible to others
  assert.equal((await api('GET', '/community/users/leaving_soon', { token: other.token })).body.profile.threadCount, 0);
});

test('the last admin cannot delete their account; with another admin present they can', async () => {
  await mongoose.model('User').updateMany({ role: 'admin' }, { $set: { role: 'user' } }); // clean slate: no admins
  const first = await signUp();
  await setRole(first.id, 'admin');
  const blocked = await api('DELETE', '/account', { token: first.token, body: { password: first.password } });
  assert.equal(blocked.status, 400);
  assert.equal((await api('GET', '/auth/me', { token: first.token })).status, 200, 'still signed in');

  const second = await signUp();
  await setRole(second.id, 'admin');
  const allowed = await api('DELETE', '/account', { token: first.token, body: { password: first.password } });
  assert.equal(allowed.status, 200);
});
