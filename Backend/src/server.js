const app = require('./app');
const { port } = require('./config/env');
const { connectDatabase, closeDatabase } = require('./config/database');

let server;
async function start() {
  await connectDatabase();
  server = app.listen(port, () => {
    console.log('API running at http://localhost:' + port);
  });
  server.on('error', async (error) => {
    console.error('Unable to start API:', error.code || 'listen failed');
    await closeDatabase();
    process.exitCode = 1;
  });
}

async function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDatabase();
  clearTimeout(timeout);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
