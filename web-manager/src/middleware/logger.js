/**
 * Request logging middleware
 */
function logger(req, res, next) {
  const startTime = Date.now();

  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
}

module.exports = logger;
