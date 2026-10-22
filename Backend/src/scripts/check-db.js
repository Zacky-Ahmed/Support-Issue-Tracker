const { connectDatabase, closeDatabase } = require('../config/database');

async function check() {
  try {
    await connectDatabase();
    console.log('Database connection check passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
check();
