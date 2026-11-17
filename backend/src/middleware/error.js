const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500, message = err.message;
  if (err.code === '23505') { status = 409; message = 'That record already exists'; }
  else if (err.code === '23514') { status = 409; message = 'Not enough tickets available'; }
  else if (err.code === '23503') { status = 409; message = 'This record is linked to other data and cannot be changed'; }
  else if (err.name === 'MulterError') { status = 400; }
  if (status >= 500) { console.error(err); message = 'Something went wrong on our side. Please try again.'; }
  res.status(status).json({ message, details: err.details });
};
module.exports = { notFound, errorHandler };
