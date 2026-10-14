const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    userId: {
      type: String,
      default: 'system'
    },
    userEmail: {
      type: String,
      default: 'system@thermalmind.io'
    },
    userRole: {
      type: String,
      default: 'System'
    },
    action: {
      type: String,
      required: true
    },
    module: {
      type: String,
      required: true // 'AUTH', 'INGESTION', 'AI_FORECAST', 'ANOMALY_DETECTION', 'RECOMMENDATIONS', 'SETTINGS', 'CLOUD'
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
