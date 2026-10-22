const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];
const LIMITS = { clientName: 120, title: 200, description: 5000 };
function validateIssue(body, partial = false) {
  const errors = {}, value = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { errors: { body: 'Provide a JSON object.' } };
  for (const [field, max] of Object.entries(LIMITS)) {
    if (partial && !Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) errors[field] = field + ' is required and must be a non-empty string.';
    else if (body[field].trim().length > max) errors[field] = field + ' must be at most ' + max + ' characters.';
    else value[field] = body[field].trim();
  }
  if (!partial || Object.hasOwn(body, 'priority')) {
    if (!PRIORITIES.includes(body.priority)) errors.priority = 'Priority must be Low, Medium, or High.';
    else value.priority = body.priority;
  }
  if (partial && Object.hasOwn(body, 'status')) {
    if (!STATUSES.includes(body.status)) errors.status = 'Status must be Open, In Progress, or Resolved.';
    else value.status = body.status;
  }
  const allowed = [...Object.keys(LIMITS), 'priority', ...(partial ? ['status'] : [])];
  if (Object.keys(body).some(key => !allowed.includes(key))) errors.fields = 'Only these fields are accepted: ' + allowed.join(', ');
  if (partial && !Object.keys(body).length) errors.body = 'Provide at least one field to update.';
  return { value, errors };
}
function validateNewIssue(body) { return validateIssue(body); }
function validateIssueUpdate(body) { return validateIssue(body, true); }
function validateQuery(query) {
  const errors = {}, value = {};
  if (Object.keys(query).some(key => !['search', 'priority', 'status'].includes(key))) errors.query = 'Supported query parameters: search, priority, status.';
  if (query.search !== undefined) {
    if (typeof query.search !== 'string' || query.search.trim().length > 200) errors.search = 'Search must be a string of at most 200 characters.';
    else value.search = query.search.trim();
  }
  for (const [field, options] of [['priority', PRIORITIES], ['status', STATUSES]]) {
    if (query[field] !== undefined) {
      if (!options.includes(query[field])) errors[field] = 'Invalid ' + field + ' filter.';
      else value[field] = query[field];
    }
  }
  return { value, errors };
}
module.exports = { validateNewIssue, validateIssueUpdate, validateQuery, LIMITS, PRIORITIES, STATUSES };
