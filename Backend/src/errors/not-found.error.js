class NotFoundError extends Error {
  constructor() { super('Issue not found'); this.name = 'NotFoundError'; this.status = 404; }
}
module.exports = { NotFoundError };
