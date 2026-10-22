const { MongoClient } = require('mongodb');
let client;
let database;

async function connectDatabase() {
  if (database) return database;
  const uri = process.env.MONGODB_URI;
  const name = process.env.MONGODB_DB_NAME;
  if (!uri || !name) throw new Error('Set MONGODB_URI and MONGODB_DB_NAME in Backend/.env');
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    await client.connect();
    const db = client.db(name);
    await db.command({ ping: 1 }, { timeoutMS: 10000 });
    database = db;
    console.log('MongoDB connected; database ping succeeded.');
    return database;
  } catch {
    await closeDatabase();
    throw new Error('MongoDB connection failed. Check credentials, database name, network access, and Atlas IP access list.');
  }
}

function getDatabase() {
  if (!database) throw new Error('Database is not connected');
  return database;
}

async function pingDatabase() {
  await getDatabase().command({ ping: 1 }, { timeoutMS: 5000 });
}

async function closeDatabase() {
  database = undefined;
  if (client) await client.close();
  client = undefined;
}

module.exports = { connectDatabase, getDatabase, pingDatabase, closeDatabase };
