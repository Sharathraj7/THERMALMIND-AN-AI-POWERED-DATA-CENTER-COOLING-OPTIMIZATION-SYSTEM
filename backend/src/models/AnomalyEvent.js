const mongoose = require('mongoose');

const anomalyEventSchema = new mongoose.Schema(
  {
    anomalyId: {
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
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    observedTemperature: {
      type: Number,
      required: true
    },
    baselineTemperature: {
      type: Number,
      required: true
    },
    anomalyScore: {
      type: Number, // Z-score or Normalized Distance
      required: true
    },
    riskCategory: {
      type: String,
      enum: ['Normal', 'Low Risk', 'Medium Risk', 'High Risk', 'Critical'],
      required: true
    },
    anomalyType: {
      type: String,
      enum: [
        'SUDDEN_SPIKE',
        'CRITICAL_HOTSPOT',
        'WORKLOAD_MISMATCH',
        'COOLING_DEGRADATION',
        'PERSISTENT_HIGH',
        'SENSOR_FAULT'
      ],
      required: true
    },
    explanation: {
      type: String,
      required: true
    },
    evidence: {
      currentTemp: Number,
      rollingMean: Number,
      rollingStd: Number,
      cpuUtilization: Number,
      powerWatts: Number,
      fanSpeed: Number,
      zScore: Number,
      temperatureDelta: Number
    },
    recommendedInvestigation: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['DETECTED', 'REVIEWED', 'DISMISSED'],
      default: 'DETECTED'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnomalyEvent', anomalyEventSchema);
