function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
    ? err.status : 500;
  if (status >= 500) console.error('Request failed:', err.name || 'Error');
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body exceeds the 1 MB limit.' });
  res.status(status).json({ message: status >= 500 ? 'Internal server error' : err.message });
}
module.exports = { notFound, errorHandler };
