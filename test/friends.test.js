process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const post = (u, title, extra = {}) =>
  api('POST', '/community/threads', {
    token: u.token,
    body: { title, body: 'A body long enough to satisfy the validation rules for a thread.', ...extra },
  });

async function befriend(a, b) {
  await api('POST', `/friends/${b.handle}`, { token: a.token });
  const r = await api('POST', `/friends/${a.handle}/accept`, { token: b.token });
  assert.equal(r.status, 200);
}

test('friend endpoints require sign-in', async () => {
  for (const [m, p] of [['GET', '/friends'], ['GET', '/friends/activity'], ['POST', '/friends/someone'], ['DELETE', '/friends/someone']]) {
    assert.equal((await api(m, p)).status, 401, `${m} ${p}`);
  }
});

test('request, accept: both sides then see each other as friends', async () => {
  const a = await signUp();
  const b = await signUp();
  const sent = await api('POST', `/friends/${b.handle}`, { token: a.token });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.status, 'requested');

  assert.deepEqual((await api('GET', '/friends', { token: a.token })).body.outgoing.map((x) => x.handle), [b.handle]);
  assert.deepEqual((await api('GET', '/friends', { token: b.token })).body.incoming.map((x) => x.handle), [a.handle]);
  assert.equal((await api('GET', `/community/users/${b.handle}`, { token: a.token })).body.profile.friendship, 'requested');
  assert.equal((await api('GET', `/community/users/${a.handle}`, { token: b.token })).body.profile.friendship, 'incoming');

  assert.equal((await api('POST', `/friends/${a.handle}/accept`, { token: b.token })).status, 200);
  assert.deepEqual((await api('GET', '/friends', { token: a.token })).body.friends.map((x) => x.handle), [b.handle]);
  assert.deepEqual((await api('GET', '/friends', { token: b.token })).body.friends.map((x) => x.handle), [a.handle]);
  assert.equal((await api('GET', `/community/users/${b.handle}`, { token: a.token })).body.profile.friendship, 'friends');
});

test('only the person asked can accept; you cannot accept your own request', async () => {
  const a = await signUp();
  const b = await signUp();
  const c = await signUp();
  await api('POST', `/friends/${b.handle}`, { token: a.token });
  assert.equal((await api('POST', `/friends/${b.handle}/accept`, { token: a.token })).status, 404, 'requester cannot accept');
  assert.equal((await api('POST', `/friends/${a.handle}/accept`, { token: c.token })).status, 404, 'a third party cannot accept');
  assert.equal((await api('GET', '/friends', { token: a.token })).body.friends.length, 0);
});

test('asking someone who already asked you is an instant friendship; asking twice is harmless', async () => {
  const a = await signUp();
  const b = await signUp();
  await api('POST', `/friends/${b.handle}`, { token: a.token });
  assert.equal((await api('POST', `/friends/${b.handle}`, { token: a.token })).body.status, 'requested');
  assert.equal(await mongoose.model('Friendship').countDocuments({ pairKey: mongoose.model('Friendship').keyFor(a.id, b.id) }), 1);
  assert.equal((await api('POST', `/friends/${a.handle}`, { token: b.token })).body.status, 'friends');
  assert.equal((await api('POST', `/friends/${a.handle}`, { token: b.token })).body.status, 'friends');
});

test('declining is silent: the requester learns nothing and cannot spam re-requests', async () => {
  const a = await signUp();
  const b = await signUp();
  await api('POST', `/friends/${b.handle}`, { token: a.token });
  assert.equal((await api('POST', `/friends/${a.handle}/decline`, { token: b.token })).status, 200);

  const mine = (await api('GET', '/friends', { token: a.token })).body;
  assert.deepEqual([mine.friends, mine.incoming, mine.outgoing], [[], [], []], 'a declined request just disappears');
  assert.equal((await api('GET', `/community/users/${b.handle}`, { token: a.token })).body.profile.friendship, 'none');

  const again = await api('POST', `/friends/${b.handle}`, { token: a.token });
  assert.equal(again.body.status, 'requested', 'looks like it worked…');
  assert.deepEqual((await api('GET', '/friends', { token: b.token })).body.incoming, [], '…but the recipient never sees it again');

  // the person who declined is free to ask
  assert.equal((await api('POST', `/friends/${a.handle}`, { token: b.token })).body.status, 'requested');
  assert.deepEqual((await api('GET', '/friends', { token: a.token })).body.incoming.map((x) => x.handle), [b.handle]);
});

test('unfriending and cancelling a request', async () => {
  const a = await signUp();
  const b = await signUp();
  const c = await signUp();
  await befriend(a, b);
  assert.equal((await api('DELETE', `/friends/${a.handle}`, { token: b.token })).status, 200, 'either side can end it');
  assert.equal((await api('GET', '/friends', { token: a.token })).body.friends.length, 0);
  await api('POST', `/friends/${c.handle}`, { token: a.token });
  await api('DELETE', `/friends/${c.handle}`, { token: a.token });
  assert.equal((await api('GET', '/friends', { token: c.token })).body.incoming.length, 0, 'cancelled request is gone');
});

test('cannot befriend yourself, strangers who do not exist, or someone in a block relationship', async () => {
  const a = await signUp();
  const b = await signUp();
  const ghost = await api('POST', '/friends/no_such_member', { token: a.token });
  assert.equal(ghost.status, 404);
  assert.equal((await api('POST', `/friends/${a.handle}`, { token: a.token })).status, 400);

  await api('POST', `/community/blocks/${b.handle}`, { token: a.token });
  const blockedByMe = await api('POST', `/friends/${b.handle}`, { token: a.token });
  const blockedMe = await api('POST', `/friends/${a.handle}`, { token: b.token });
  assert.equal(blockedByMe.status, 404);
  assert.equal(blockedMe.status, 404);
  assert.deepEqual(blockedMe.body, ghost.body, 'a block must look exactly like "no such member"');
});

test('blocking a friend ends the friendship', async () => {
  const a = await signUp();
  const b = await signUp();
  await befriend(a, b);
  await api('POST', `/community/blocks/${b.handle}`, { token: a.token });
  assert.equal((await api('GET', '/friends', { token: a.token })).body.friends.length, 0);
  assert.equal((await api('GET', '/friends', { token: b.token })).body.friends.length, 0);
});

test('activity feed: only friends, only public posts, nothing removed, nothing private', async () => {
  const me = await signUp();
  const friend = await signUp();
  const stranger = await signUp();
  const blockedFriend = await signUp();
  const empty = await api('GET', '/friends/activity', { token: me.token });
  assert.deepEqual([empty.body.hasFriends, empty.body.items], [false, []]);

  await befriend(me, friend);
  await befriend(me, blockedFriend);
  await api('POST', '/groups/parkinsons/join', { token: friend.token });
  const friendThread = (await post(friend, 'My friend started this discussion', { group: 'parkinsons' })).body.thread;
  await post(stranger, 'A stranger started this discussion');
  const removedThread = (await post(friend, 'This one will be removed soon')).body.thread;
  await api('DELETE', `/community/threads/${removedThread.id}`, { token: friend.token });
  const strangerThread = (await post(stranger, 'Thread the friend will reply to')).body.thread;
  await api('POST', `/community/threads/${strangerThread.id}/replies`, { token: friend.token, body: { body: 'Friend reply to a stranger thread' } });
  await post(blockedFriend, 'Thread from someone I later block');
  await api('POST', `/community/blocks/${blockedFriend.handle}`, { token: me.token });
  // private data must never appear
  await api('POST', '/pain', { token: friend.token, body: { location: { partId: 'FJ1', partName: 'Right knee', system: 'skeletal', side: 'right', point: [0, 0.5, 0] }, painTypes: ['sharp'], severity: 5, onset: new Date().toISOString(), notes: 'PRIVATE PAIN NOTE', visibility: 'community' } });

  const feed = await api('GET', '/friends/activity', { token: me.token });
  assert.equal(feed.status, 200);
  assert.equal(feed.body.hasFriends, true);
  const titles = feed.body.items.map((i) => `${i.type}:${i.title}`);
  assert.ok(titles.includes('thread:My friend started this discussion'));
  assert.ok(titles.includes('reply:Thread the friend will reply to'));
  assert.ok(!titles.some((t) => /stranger started|removed soon|later block/.test(t)), `unexpected items: ${titles}`);
  const item = feed.body.items.find((i) => i.threadId === friendThread.id);
  assert.deepEqual(item.group, { slug: 'parkinsons', name: "Parkinson's Disease" });
  assert.equal(item.friend, friend.handle);
  const raw = JSON.stringify(feed.body);
  for (const secret of ['PRIVATE PAIN NOTE', 'Right knee', friend.email, friend.id, 'Test Person']) assert.ok(!raw.includes(secret), `feed leaked ${secret}`);
  // a stranger sees nothing of this
  assert.equal((await api('GET', '/friends/activity', { token: stranger.token })).body.hasFriends, false);
});

test('activity drops replies once their thread is removed by a moderator or the author', async () => {
  const me = await signUp();
  const friend = await signUp();
  const author = await signUp();
  await befriend(me, friend);
  const t = (await post(author, 'A thread that will disappear')).body.thread;
  await api('POST', `/community/threads/${t.id}/replies`, { token: friend.token, body: { body: 'a friend reply' } });
  assert.ok((await api('GET', '/friends/activity', { token: me.token })).body.items.some((i) => i.title === 'A thread that will disappear'));
  await api('DELETE', `/community/threads/${t.id}`, { token: author.token });
  assert.ok(!(await api('GET', '/friends/activity', { token: me.token })).body.items.some((i) => i.threadId === t.id));
});

test('deleting an account removes its friendships and requests', async () => {
  const a = await signUp();
  const b = await signUp();
  const c = await signUp();
  await befriend(a, b);
  await api('POST', `/friends/${c.handle}`, { token: a.token });
  assert.equal((await api('DELETE', '/account', { token: a.token, body: { password: a.password } })).status, 200);
  assert.equal(await mongoose.model('Friendship').countDocuments({ $or: [{ requesterId: a.id }, { recipientId: a.id }] }), 0);
  assert.equal((await api('GET', '/friends', { token: b.token })).body.friends.length, 0);
  assert.equal((await api('GET', '/friends', { token: c.token })).body.incoming.length, 0);
});

test('friend handles in the URL cannot be used for injection or traversal', async () => {
  const a = await signUp();
  for (const h of ['%24ne', '..%2F..%2Fadmin', 'a', 'x'.repeat(40), '%00']) {
    const r = await api('POST', `/friends/${h}`, { token: a.token });
    assert.ok([400, 404].includes(r.status), `${h} -> ${r.status}`);
  }
});
