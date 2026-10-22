const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/issue.service');
const repository = require('../src/repositories/issue.repository');
const { validateNewIssue, validateIssueUpdate, validateQuery } = require('../src/validators/issue.validator');
const { ValidationError } = require('../src/errors/validation.error');
const id = '123456789012345678901234';
const valid = { clientName: 'Nova Tech', title: 'Payment issue', description: 'Fictional example', priority: 'High' };
afterEach(() => mock.restoreAll());
test('assignment accepts roster names and optional unassigned, rejects invalid types and names', () => {
  for (const assignedEngineer of ['', ...service.listEngineers()]) {
    assert.deepEqual(validateNewIssue({ ...valid, assignedEngineer }).errors, {});
    assert.deepEqual(validateIssueUpdate({ assignedEngineer }).errors, {});
  }
  assert.equal(validateNewIssue(valid).value.assignedEngineer, '');
  for (const assignedEngineer of [null, 4, [], {}, ' ', 'Unknown Engineer']) {
    assert.ok(validateNewIssue({ ...valid, assignedEngineer }).errors.assignedEngineer);
    assert.ok(validateIssueUpdate({ assignedEngineer }).errors.assignedEngineer);
  }
});
test('engineer filters validate exact roster names and Unassigned', () => {
  for (const assignedEngineer of [...service.listEngineers(), 'Unassigned']) assert.deepEqual(validateQuery({assignedEngineer}).errors,{});
  for (const assignedEngineer of ['', 'Unknown', [], {}]) assert.ok(validateQuery({assignedEngineer}).errors.assignedEngineer);
});
test('resolving an unassigned or legacy issue is rejected before writing', async () => {
  const write = mock.method(repository, 'updateIssue', async () => {});
  for (const assignedEngineer of [undefined, '', null]) {
    mock.method(repository, 'findIssue', async () => ({ status: 'Open', assignedEngineer }));
    await assert.rejects(service.editIssue(id, {status:'Resolved'}), ValidationError);
  }
  assert.equal(write.mock.callCount(),0);
});
test('assignment and resolution can be saved together; clearing assignment on resolved is rejected', async () => {
  const current = { status: 'Open', reportedAt: new Date(), assignedEngineer: '' };
  mock.method(repository, 'findIssue', async () => current);
  mock.method(repository, 'updateIssue', async (key, changes) => ({...current, ...changes}));
  const result = await service.editIssue(id, {status:'Resolved', assignedEngineer:'Alex Morgan'});
  assert.equal(result.status,'Resolved');
  assert.equal(result.assignedEngineer,'Alex Morgan');
  current.status='Resolved'; current.assignedEngineer='Alex Morgan';
  await assert.rejects(service.editIssue(id,{assignedEngineer:''}),ValidationError);
  const reopened = await service.editIssue(id,{status:'Open',assignedEngineer:''});
  assert.equal(reopened.status,'Open'); assert.equal(reopened.assignedEngineer,'');
});
test('concurrent change returns conflict instead of overwriting rule-relevant fields', async () => {
  mock.method(repository,'findIssue',async()=>({status:'Open',assignedEngineer:'Alex Morgan'}));
  mock.method(repository,'updateIssue',async()=>null);
  await assert.rejects(service.editIssue(id,{status:'Resolved'}),error=>error.status===409);
});
