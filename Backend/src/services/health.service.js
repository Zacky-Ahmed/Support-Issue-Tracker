const healthRepository = require('../repositories/health.repository');

async function checkHealth() {
  try {
    await healthRepository.ping();
    return { status: 'ok', service: 'Support Issue Tracker API', database: 'connected' };
  } catch {
    return { status: 'error', service: 'Support Issue Tracker API', database: 'unavailable' };
  }
}
module.exports = { checkHealth };
