const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongodb');
const { connectDatabase, closeDatabase } = require('../../src/config/database');
const app = require('../../src/app');

test('create via HTTP, read back from MongoDB, reject invalid input, clean up test records', async () => {
  let db, server;
  const marker = 'Fictional integration test ' + randomUUID();
  try {
    db = await connectDatabase();
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const url = 'http://127.0.0.1:' + server.address().port + '/api/issues';
    const body = { clientName: marker, title: 'Fictional payment failure', description: 'Temporary automated test record', priority: 'High' };
    const post = (data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const response = await post(body);
    assert.equal(response.status, 201);
    const { issue } = await response.json();
    const saved = await db.collection('issues').findOne({ _id: new ObjectId(issue._id) });
    assert.equal(saved.clientName, marker);
    assert.equal(saved.title, body.title);
    assert.equal(saved.description, body.description);
    assert.equal(saved.priority, 'High');
    assert.equal(saved.status, 'Open');
    assert.ok(saved.reportedAt instanceof Date);
    assert.equal(saved.reportedAt.toISOString(), issue.reportedAt);
    assert.equal((await post({ ...body, priority: 'Invalid' })).status, 400);
    assert.equal(await db.collection('issues').countDocuments({ clientName: marker }), 1);
  } finally {
    try {
      if (server) await new Promise(resolve => server.close(resolve));
      if (db) {
        await db.collection('issues').deleteMany({ clientName: marker });
        assert.equal(await db.collection('issues').countDocuments({ clientName: marker }), 0);
      }
    } finally { await closeDatabase(); }
  }
});
