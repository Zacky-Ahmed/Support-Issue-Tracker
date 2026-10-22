const repository = require('../repositories/issue.repository');
const { validateNewIssue, validateIssueUpdate, validateQuery } = require('../validators/issue.validator');
const { ValidationError } = require('../errors/validation.error');
const { NotFoundError } = require('../errors/not-found.error');
function checked(result) {
  if (Object.keys(result.errors).length) throw new ValidationError(result.errors);
  return result.value;
}
function validateId(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) throw new ValidationError({ id: 'Issue ID must be a 24-character hexadecimal ID.' });
}
function withOverdue(issue, now = Date.now()) {
  return { ...issue, isOverdue: issue.priority === 'High' && issue.status !== 'Resolved' && now - new Date(issue.reportedAt).getTime() > 86400000 };
}
async function createIssue(input) {
  const value = checked(validateNewIssue(input));
  return withOverdue(await repository.insertIssue({ ...value, status: 'Open', reportedAt: new Date() }));
}
async function listIssues(query = {}) {
  const issues = await repository.findIssues(checked(validateQuery(query)));
  const now = Date.now();
  return issues.map(issue => withOverdue(issue, now));
}
async function getIssue(id) {
  validateId(id);
  const issue = await repository.findIssue(id);
  if (!issue) throw new NotFoundError();
  return withOverdue(issue);
}
async function editIssue(id, input) {
  validateId(id);
  const issue = await repository.updateIssue(id, checked(validateIssueUpdate(input)));
  if (!issue) throw new NotFoundError();
  return withOverdue(issue);
}
async function removeIssue(id) {
  validateId(id);
  if (!await repository.deleteIssue(id)) throw new NotFoundError();
}
module.exports = { createIssue, listIssues, getIssue, editIssue, removeIssue, withOverdue };
