/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error(`[${new Date().toISOString()}] ERROR:`, err);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  const message = err.message || 'Internal server error';

  // Send error response
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
