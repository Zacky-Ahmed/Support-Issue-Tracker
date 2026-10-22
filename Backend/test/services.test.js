const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const issueRepository = require('../src/repositories/issue.repository');
const healthRepository = require('../src/repositories/health.repository');
const { createIssue } = require('../src/services/issue.service');
const { checkHealth } = require('../src/services/health.service');
const { ValidationError } = require('../src/errors/validation.error');
const valid = { clientName: '  Nova Tech  ', title: ' Payment failure ', description: ' Fictional issue ', priority: 'High' };
afterEach(() => mock.restoreAll());

test('service validates input without HTTP and never persists invalid data', async () => {
  const insert = mock.method(issueRepository, 'insertIssue', async () => { throw new Error('Must not insert'); });
  for (const input of [null, {}, { ...valid, priority: 'Invalid' }, { ...valid, status: 'Resolved' }]) {
    await assert.rejects(createIssue(input), ValidationError);
  }
  assert.equal(insert.mock.callCount(), 0);
});
test('service normalizes input and assigns defaults before repository call', async () => {
  const insert = mock.method(issueRepository, 'insertIssue', async (issue) => ({ ...issue, _id: 'generated-id' }));
  const start = Date.now();
  const issue = await createIssue(valid);
  assert.equal(insert.mock.callCount(), 1);
  assert.equal(issue.clientName, 'Nova Tech');
  assert.equal(issue.title, 'Payment failure');
  assert.equal(issue.description, 'Fictional issue');
  assert.equal(issue.status, 'Open');
  assert.equal(issue._id, 'generated-id');
  assert.ok(issue.reportedAt instanceof Date);
  assert.ok(issue.reportedAt.getTime() >= start);
});
test('service propagates repository failure for HTTP error middleware', async () => {
  const failure = new Error('Database unavailable');
  mock.method(issueRepository, 'insertIssue', async () => { throw failure; });
  await assert.rejects(createIssue(valid), error => error === failure);
});
test('health service reports successful database ping', async () => {
  mock.method(healthRepository, 'ping', async () => {});
  assert.deepEqual(await checkHealth(), { status: 'ok', service: 'Support Issue Tracker API', database: 'connected' });
});
test('health service reports failed database ping without exposing details', async () => {
  mock.method(healthRepository, 'ping', async () => { throw new Error('Private details'); });
  assert.deepEqual(await checkHealth(), { status: 'error', service: 'Support Issue Tracker API', database: 'unavailable' });
});
