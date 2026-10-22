const PRIORITIES = ['Low', 'Medium', 'High'];
const LIMITS = { clientName: 120, title: 200, description: 5000 };

function validateNewIssue(body) {
  const errors = {};
  const value = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Provide a JSON object.' } };
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      errors[field] = field + ' is required and must be a non-empty string.';
    } else if (body[field].trim().length > max) {
      errors[field] = field + ' must be at most ' + max + ' characters.';
    } else {
      value[field] = body[field].trim();
    }
  }
  if (!PRIORITIES.includes(body.priority)) {
    errors.priority = 'Priority must be Low, Medium, or High.';
  } else {
    value.priority = body.priority;
  }
  // Reject unknown/server-owned fields rather than silently accepting typos or overrides.
  const allowed = [...Object.keys(LIMITS), 'priority'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    errors.fields = 'Only clientName, title, description, and priority are accepted.';
  }
  return { value, errors };
}
module.exports = { validateNewIssue, LIMITS, PRIORITIES };
