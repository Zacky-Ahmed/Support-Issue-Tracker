const { checkHealth } = require('../services/health.service');

async function getHealth(req, res) {
  const health = await checkHealth();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
}
module.exports = { getHealth };
