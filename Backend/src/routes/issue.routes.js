const router = require('express').Router();
const { addIssue } = require('../controllers/issue.controller');
router.post('/', addIssue);
module.exports = router;
