const issueRepository = require('../repositories/issue.repository');
const { validateNewIssue } = require('../validators/issue.validator');
const { ValidationError } = require('../errors/validation.error');

async function createIssue(input) {
  const { value, errors } = validateNewIssue(input);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const issue = {
    ...value,
    status: 'Open',
    reportedAt: new Date(),
  };
  return issueRepository.insertIssue(issue);
}
module.exports = { createIssue };
