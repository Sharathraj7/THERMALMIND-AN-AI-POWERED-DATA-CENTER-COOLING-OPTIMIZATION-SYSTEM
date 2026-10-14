/**
 * ThermalMind Cloud Operations Controller
 */

const { getSystemCloudStatus } = require('../cloud/cloudManager');

async function getCloudStatus(req, res, next) {
  try {
    const status = await getSystemCloudStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
}

async function healthCheck(req, res) {
  res.json({
    status: 'UP',
    service: 'ThermalMind Backend API',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getCloudStatus,
  healthCheck
};
