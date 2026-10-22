const database = require('../config/database');

async function insertIssue(issue) {
  const result = await database.getDatabase().collection('issues').insertOne(issue, { timeoutMS: 10000 });
  return { ...issue, _id: result.insertedId };
}
module.exports = { insertIssue };
