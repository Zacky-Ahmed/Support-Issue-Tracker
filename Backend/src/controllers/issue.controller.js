const { validateNewIssue } = require('../validators/issue.validator');
const { createIssue } = require('../services/issue.service');

async function addIssue(req, res) {
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Content-Type must be application/json.' });
  }
  const { value, errors } = validateNewIssue(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  const issue = await createIssue(value);
  return res.status(201).json({ issue });
}
module.exports = { addIssue };
