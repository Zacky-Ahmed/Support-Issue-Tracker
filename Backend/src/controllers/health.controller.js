const { pingDatabase } = require('../config/database');

async function getHealth(req, res) {
  try {
    await pingDatabase();
    res.json({ status: 'ok', service: 'Support Issue Tracker API', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: 'Support Issue Tracker API', database: 'unavailable' });
  }
}
module.exports = { getHealth };
