const router = require('express').Router();
const { getHealth } = require('../controllers/health.controller');
router.get('/health', getHealth);
router.get('/engineers', require('../controllers/issue.controller').listEngineers);
router.use('/issues', require('./issue.routes'));
module.exports = router;
