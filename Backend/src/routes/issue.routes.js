const router = require('express').Router();
const controller = require('../controllers/issue.controller');
router.post('/', controller.requireJson, controller.addIssue);
router.get('/', controller.listIssues);
router.get('/:id', controller.getIssue);
router.patch('/:id', controller.requireJson, controller.editIssue);
router.delete('/:id', controller.deleteIssue);
module.exports = router;
