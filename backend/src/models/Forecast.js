const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema(
  {
    forecastId: {
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
    baseTimestamp: {
      type: Date,
      required: true
    },
    horizonMinutes: {
      type: Number,
      required: true, // 15, 30, or 60
      enum: [15, 30, 60]
    },
    predictedTemperature: {
      type: Number,
      required: true
    },
    confidenceInterval: {
      lower: Number,
      upper: Number
    },
    modelVersion: {
      type: String,
      default: 'v1.0-ridge-regression'
    },
    evaluationMetrics: {
      mae: Number,
      rmse: Number
    },
    inputFeatures: {
      currentTemp: Number,
      cpuUtilization: Number,
      powerWatts: Number,
      humidity: Number,
      fanSpeed: Number,
      tempTrend: Number // Slope °C / 10min
    }
  },
  { timestamps: true }
);

forecastSchema.index({ rackId: 1, baseTimestamp: -1, horizonMinutes: 1 });

module.exports = mongoose.model('Forecast', forecastSchema);
