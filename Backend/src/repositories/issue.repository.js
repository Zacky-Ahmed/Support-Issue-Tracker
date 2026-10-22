const { ObjectId } = require('mongodb');
const database = require('../config/database');
const collection = () => database.getDatabase().collection('issues');
const options = { timeoutMS: 10000 };
async function insertIssue(issue) {
  const result = await collection().insertOne(issue, options);
  return { ...issue, _id: result.insertedId };
}
async function findIssues(filters) {
  const query = {};
  if (filters.priority) query.priority = filters.priority;
  if (filters.status) query.status = filters.status;
  if (filters.assignedEngineer) query.assignedEngineer = filters.assignedEngineer === 'Unassigned' ? { $in: ['', null] } : filters.assignedEngineer;
  if (filters.search) {
    // Escape regex syntax so search always means literal text.
    const pattern = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ clientName: { $regex: pattern, $options: 'i' } }, { title: { $regex: pattern, $options: 'i' } }];
  }
  return collection().find(query, options).sort({ reportedAt: -1, _id: -1 }).toArray();
}
async function findIssue(id) { return collection().findOne({ _id: new ObjectId(id) }, options); }
async function updateIssue(id, changes, expected) {
  // Compare the fields used by the resolution rule to prevent concurrent bypasses.
  const query = { _id: new ObjectId(id), status: expected.status, assignedEngineer: expected.assignedEngineer ?? null };
  return collection().findOneAndUpdate(query, { $set: changes }, { ...options, returnDocument: 'after', includeResultMetadata: false });
}
async function deleteIssue(id) {
  const result = await collection().deleteOne({ _id: new ObjectId(id) }, options);
  return result.deletedCount === 1;
}
module.exports = { insertIssue, findIssues, findIssue, updateIssue, deleteIssue };
