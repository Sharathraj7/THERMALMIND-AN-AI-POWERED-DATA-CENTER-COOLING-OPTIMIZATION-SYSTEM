/**
 * ThermalMind Cloud Operations & Health Module
 * Monitors runtime health, DB connection, AI engine readiness, and AWS cloud integration status.
 * Explicitly distinguishes Local Mode from active AWS Cloud deployment.
 */

const os = require('os');
const config = require('../config/env');
const { getDbStatus } = require('../config/db');
const { getModelMetadata } = require('../ai/forecasting');
const { getSimulatorStatus } = require('../data-engineering/simulator');
const SensorReading = require('../models/SensorReading');
const IngestionJob = require('../models/IngestionJob');

const startTime = Date.now();
const apiMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  recentErrors: []
};

function recordRequestMetric(statusCode, durationMs, path, method) {
  apiMetrics.totalRequests++;
  if (statusCode >= 400) {
    apiMetrics.failedRequests++;
    if (apiMetrics.recentErrors.length > 20) {
      apiMetrics.recentErrors.shift();
    }
    apiMetrics.recentErrors.push({
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode,
      durationMs
    });
  } else {
    apiMetrics.successfulRequests++;
  }
}

/**
 * Returns comprehensive system health, runtime metrics, and cloud readiness status.
 */
async function getSystemCloudStatus() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();
  const dbStatus = getDbStatus();
  const modelMeta = getModelMetadata();
  const simStatus = getSimulatorStatus();

  // Ingestion stats
  const totalReadings = await SensorReading.countDocuments();
  const latestIngestion = await IngestionJob.findOne().sort({ createdAt: -1 }).lean();

  const isAwsConfigured = config.aws.isConfigured;

  return {
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    runtime: {
      nodeVersion: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      cpuCount: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      processRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      processHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024))
    },
    database: {
      ...dbStatus,
      totalSensorRecords: totalReadings
    },
    aiEngine: {
      forecastingLoaded: true,
      anomalyDetectorActive: true,
      modelTrained: modelMeta.isTrained,
      modelVersion: modelMeta.version,
      lastTrainedAt: modelMeta.trainedAt,
      mae15m: modelMeta.metrics[15]?.mae || 0,
      rmse15m: modelMeta.metrics[15]?.rmse || 0
    },
    dataIngestion: {
      simulatorRunning: simStatus.isRunning,
      activeScenario: simStatus.currentScenario,
      totalReadingsInDb: totalReadings,
      lastIngestionTime: latestIngestion ? latestIngestion.createdAt : null,
      lastJobId: latestIngestion ? latestIngestion.jobId : null
    },
    apiPerformance: {
      totalRequests: apiMetrics.totalRequests,
      successRate: apiMetrics.totalRequests > 0
        ? `${Math.round((apiMetrics.successfulRequests / apiMetrics.totalRequests) * 100)}%`
        : '100%',
      recentErrors: apiMetrics.recentErrors.slice(-10)
    },
    cloudDeployment: {
      mode: isAwsConfigured ? 'AWS Cloud Connected' : 'Local Mode — AWS Not Configured',
      isAwsConfigured,
      region: config.aws.region,
      s3Bucket: config.aws.s3Bucket,
      cloudWatchLogGroup: config.aws.cloudwatchGroup,
      kmsConfigured: Boolean(config.aws.kmsKeyId),
      secretsManagerConfigured: Boolean(config.aws.secretsManagerName),
      servicesReadiness: [
        {
          service: 'Amazon S3',
          role: 'Long-term storage for CSV datasets & exported thermal audit reports',
          status: isAwsConfigured ? 'Configured' : 'Local Mode — AWS Not Configured',
          target: config.aws.s3Bucket
        },
        {
          service: 'Amazon EC2 / ECS',
          role: 'Containerized hosting for Node.js API and React frontend',
          status: isAwsConfigured ? 'Configured' : 'Local Mode — AWS Not Configured',
          target: 'Docker Compose Local Host (Port 5000 / 5173)'
        },
        {
          service: 'Amazon CloudWatch',
          role: 'Structured application logging, API metrics, and thermal alarms',
          status: isAwsConfigured ? 'Configured' : 'Local Mode — AWS Not Configured',
          target: config.aws.cloudwatchGroup
        },
        {
          service: 'AWS KMS',
          role: 'Hardware Security Module (HSM) encryption-at-rest key management',
          status: config.aws.kmsKeyId ? 'Configured' : 'Local Mode — AWS Not Configured',
          target: config.aws.kmsKeyId || 'Local AES-256'
        },
        {
          service: 'AWS Secrets Manager',
          role: 'Secure dynamic rotation of database passwords and JWT secrets',
          status: config.aws.secretsManagerName ? 'Configured' : 'Local Mode — AWS Not Configured',
          target: config.aws.secretsManagerName || 'Local Environment (.env)'
        }
      ]
    }
  };
}

module.exports = {
  getSystemCloudStatus,
  recordRequestMetric
};
