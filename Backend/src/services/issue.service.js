const database = require('../config/database');

async function createIssue(values) {
  const issue = {
    clientName: values.clientName,
    title: values.title,
    description: values.description,
    priority: values.priority,
    status: 'Open',
    reportedAt: new Date(),
  };
  const result = await database.getDatabase().collection('issues').insertOne(issue, { timeoutMS: 10000 });
  return { ...issue, _id: result.insertedId };
}
module.exports = { createIssue };
