const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../src/repositories/issue.repository');
const service = require('../src/services/issue.service');
const { ValidationError } = require('../src/errors/validation.error');
const { NotFoundError } = require('../src/errors/not-found.error');
const id = '123456789012345678901234';
afterEach(() => mock.restoreAll());
test('overdue requires High priority, unresolved status and strictly more than 24 hours', () => {
  const now = Date.now();
  for (const priority of ['Low','Medium','High']) for (const status of ['Open','In Progress','Resolved']) for (const age of [0, 86400000, 86400001]) {
    assert.equal(service.withOverdue({ priority, status, reportedAt: new Date(now-age) }, now).isOverdue, priority==='High' && status!=='Resolved' && age>86400000);
  }
});
test('invalid IDs rejected before repository access', async () => {
  for (const bad of ['', 'abc', 'z'.repeat(24), null]) {
    await assert.rejects(service.getIssue(bad), ValidationError);
    await assert.rejects(service.editIssue(bad, {status:'Open'}), ValidationError);
    await assert.rejects(service.removeIssue(bad), ValidationError);
  }
});
test('missing records return application not-found errors', async () => {
  mock.method(repository,'findIssue',async()=>null);
  mock.method(repository,'updateIssue',async()=>null);
  mock.method(repository,'deleteIssue',async()=>false);
  await assert.rejects(service.getIssue(id),NotFoundError);
  await assert.rejects(service.editIssue(id,{status:'Open'}),NotFoundError);
  await assert.rejects(service.removeIssue(id),NotFoundError);
});
test('invalid update fields and empty updates never reach repository', async () => {
  const update=mock.method(repository,'updateIssue',async()=>{});
  for (const body of [{},null,[],{status:'closed'},{priority:'urgent'},{reportedAt:'yesterday'},{_id:id},{$set:{status:'Open'}},{isOverdue:false},{title:''},{description:4},{clientName:'x'.repeat(121)}]) await assert.rejects(service.editIssue(id,body),ValidationError);
  assert.equal(update.mock.callCount(),0);
});
test('invalid query parameters rejected before database access', async () => {
  const find=mock.method(repository,'findIssues',async()=>[]);
  for (const query of [{status:'closed'},{priority:'all'},{search:['a','b']},{search:'x'.repeat(201)},{unknown:'x'},{priority:{$ne:''}}]) await assert.rejects(service.listIssues(query),ValidationError);
  assert.equal(find.mock.callCount(),0);
});
test('empty collection returns empty list', async () => {
  mock.method(repository,'findIssues',async()=>[]);
  assert.deepEqual(await service.listIssues(),[]);
});
