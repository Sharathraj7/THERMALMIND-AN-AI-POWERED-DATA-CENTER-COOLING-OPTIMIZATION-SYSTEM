/**
 * ThermalMind Application Configuration
 * Validates and exposes environment variables with safe defaults.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/thermalmind',
  useInMemoryDb: process.env.USE_IN_MEMORY_DB || 'auto', // 'auto', 'true', or 'false'
  jwtSecret: process.env.JWT_SECRET || 'thermalmind_super_secure_jwt_secret_key_2026_dc_cooling',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  simulatorIntervalMs: parseInt(process.env.SIMULATOR_INTERVAL_MS || '4000', 10),

  // AWS Configuration (Read-only status flags)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'thermalmind-telemetry-reports',
    cloudwatchGroup: process.env.AWS_CLOUDWATCH_GROUP || '/thermalmind/datacenter-cooling',
    kmsKeyId: process.env.AWS_KMS_KEY_ID || '',
    secretsManagerName: process.env.AWS_SECRETS_MANAGER_SECRET_NAME || '',
    isConfigured: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  }
};

module.exports = config;
