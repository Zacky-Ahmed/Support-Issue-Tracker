const { createIssue } = require('../services/issue.service');

async function addIssue(req, res) {
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Content-Type must be application/json.' });
  }
  const issue = await createIssue(req.body);
  return res.status(201).json({ issue });
}
module.exports = { addIssue };
