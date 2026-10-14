const mongoose = require('mongoose');

const coolingRecommendationSchema = new mongoose.Schema(
  {
    recommendationId: {
      type: String,
      required: true,
      unique: true
    },
    rackId: {
      type: String,
      required: true,
      index: true
    },
    serverId: {
      type: String,
      default: null
    },
    anomalyId: {
      type: String,
      default: null
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      required: true
    },
    supportingEvidence: {
      currentTemp: Number,
      safeLimit: Number,
      cpuUtilization: Number,
      powerWatts: Number,
      coolingIntensity: Number,
      forecast60Min: Number
    },
    recommendedAction: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Open', 'Acknowledged', 'Resolved'],
      default: 'Open',
      index: true
    },
    acknowledgedBy: {
      type: String,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNotes: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CoolingRecommendation', coolingRecommendationSchema);
