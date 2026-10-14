const mongoose = require('mongoose');

const ingestionJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true
    },
    filename: {
      type: String,
      required: true
    },
    dataSource: {
      type: String,
      enum: ['csv_upload', 'historical_import', 'synthetic_simulation'],
      default: 'csv_upload'
    },
    totalProcessed: {
      type: Number,
      default: 0
    },
    validRecords: {
      type: Number,
      default: 0
    },
    invalidRecords: {
      type: Number,
      default: 0
    },
    duplicateRecords: {
      type: Number,
      default: 0
    },
    missingValuesDetected: {
      type: Number,
      default: 0
    },
    durationMs: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING'
    },
    errorDetails: [
      {
        row: Number,
        field: String,
        message: String,
        rawData: mongoose.Schema.Types.Mixed
      }
    ],
    executedBy: {
      type: String,
      default: 'System'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('IngestionJob', ingestionJobSchema);
