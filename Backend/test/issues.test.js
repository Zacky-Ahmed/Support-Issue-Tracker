const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const database = require('../src/config/database');
const app = require('../src/app');
const { LIMITS } = require('../src/validators/issue.validator');
const valid = { clientName: 'Nova Tech', title: 'Payment failure', description: 'Fictional test issue', priority: 'High' };
let server, url, stored, failure;
let writes = 0;
before(async () => {
  mock.method(database, 'getDatabase', () => ({ collection: () => ({ insertOne: async (doc) => {
    if (failure) throw new Error('Private database failure details');
    writes++;
    stored = doc;
    return { insertedId: new ObjectId() };
  } }) }));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  url = 'http://127.0.0.1:' + server.address().port + '/api/issues';
});
after(async () => { await new Promise(resolve => server.close(resolve)); mock.restoreAll(); });
const post = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('all priorities create trimmed issues with unique IDs and server time', async () => {
  const ids = new Set();
  for (const priority of ['Low', 'Medium', 'High']) {
    const beforeTime = Date.now();
    const response = await post({ ...valid, clientName: '  Nova Tech  ', priority });
    assert.equal(response.status, 201);
    const { issue } = await response.json();
    assert.equal(issue.clientName, 'Nova Tech');
    assert.equal(issue.status, 'Open');
    assert.equal(issue.priority, priority);
    assert.match(issue._id, /^[a-f0-9]{24}$/);
    assert.ok(new Date(issue.reportedAt).getTime() >= beforeTime);
    assert.ok(new Date(issue.reportedAt).getTime() <= Date.now());
    assert.ok(stored.reportedAt instanceof Date);
    ids.add(issue._id);
  }
  assert.equal(ids.size, 3);
});

for (const field of ['clientName', 'title', 'description']) {
  for (const invalid of [undefined, null, '', '   ', 12, {}, []]) {
    test(field + ' rejects ' + JSON.stringify(invalid), async () => {
      const count = writes;
      const response = await post({ ...valid, [field]: invalid });
      assert.equal(response.status, 400);
      assert.ok((await response.json()).errors[field]);
      assert.equal(writes, count);
    });
  }
  test(field + ' accepts limit and rejects overflow', async () => {
    assert.equal((await post({ ...valid, [field]: 'a'.repeat(LIMITS[field]) })).status, 201);
    const count = writes;
    assert.equal((await post({ ...valid, [field]: 'a'.repeat(LIMITS[field] + 1) })).status, 400);
    assert.equal(writes, count);
  });
}
for (const priority of [undefined, null, '', 'high', 'Urgent', 1, {}]) {
  test('rejects priority ' + JSON.stringify(priority), async () => {
    const count = writes;
    assert.equal((await post({ ...valid, priority })).status, 400);
    assert.equal(writes, count);
  });
}
for (const extra of ['_id', 'status', 'reportedAt', '$set', 'unexpected']) {
  test('rejects extra field ' + extra, async () => {
    const count = writes;
    assert.equal((await post({ ...valid, [extra]: 'override' })).status, 400);
    assert.equal(writes, count);
  });
}
test('rejects arrays, null, empty object, malformed JSON, wrong media type and oversized body', async () => {
  const count = writes;
  for (const body of [[], null, {}]) assert.equal((await post(body)).status, 400);
  const malformed = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, 'Invalid JSON body.');
  assert.equal((await fetch(url, { method: 'POST', body: 'hello' })).status, 415);
  assert.equal((await post({ ...valid, description: 'x'.repeat(1024 * 1024) })).status, 413);
  assert.equal(writes, count);
});
test('database failure returns generic 500 without exposing details', async () => {
  failure = true;
  try {
    const response = await post(valid);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
  } finally { failure = false; }
});
