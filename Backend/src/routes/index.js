const router = require('express').Router();
const { getHealth } = require('../controllers/health.controller');
router.get('/health', getHealth);
router.use('/issues', require('./issue.routes'));
module.exports = router;
