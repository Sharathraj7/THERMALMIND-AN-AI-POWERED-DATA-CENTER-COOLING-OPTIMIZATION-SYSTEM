/**
 * ThermalMind Centralized Error Handler
 * Ensures consistent JSON responses, hides stack traces in production, and prevents leaking credentials.
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  console.error(`[ERROR] [${req.method}] ${req.originalUrl || req.url}: ${err.message}`);

  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'Uploaded file exceeds the maximum allowed size limit (10MB).'
    });
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected server error occurred.',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Resource not found: [${req.method}] ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
