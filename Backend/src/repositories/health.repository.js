const database = require('../config/database');

async function ping() {
  await database.pingDatabase();
}
module.exports = { ping };
