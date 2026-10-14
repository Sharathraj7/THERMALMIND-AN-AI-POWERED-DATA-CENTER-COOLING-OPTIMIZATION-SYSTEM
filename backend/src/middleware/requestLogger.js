/**
 * ThermalMind Request Logger & Metrics Interceptor
 */

const { recordRequestMetric } = require('../cloud/cloudManager');

function requestMetricsLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    recordRequestMetric(res.statusCode, duration, req.originalUrl || req.url, req.method);
  });

  next();
}

module.exports = {
  requestMetricsLogger
};
