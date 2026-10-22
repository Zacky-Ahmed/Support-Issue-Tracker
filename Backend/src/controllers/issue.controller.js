const service = require('../services/issue.service');
function requireJson(req, res, next) {
  if (!req.is('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json.' });
  next();
}
async function addIssue(req, res) { res.status(201).json({ issue: await service.createIssue(req.body) }); }
async function listIssues(req, res) { res.json({ issues: await service.listIssues(req.query) }); }
async function getIssue(req, res) { res.json({ issue: await service.getIssue(req.params.id) }); }
async function editIssue(req, res) { res.json({ issue: await service.editIssue(req.params.id, req.body) }); }
async function deleteIssue(req, res) { await service.removeIssue(req.params.id); res.status(204).end(); }
module.exports = { requireJson, addIssue, listIssues, getIssue, editIssue, deleteIssue };
