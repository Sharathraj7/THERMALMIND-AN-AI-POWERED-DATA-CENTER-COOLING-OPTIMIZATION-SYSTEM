const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default_config'
    },
    warningTempThreshold: {
      type: Number,
      default: 32.0 // ASHRAE Recommended Warning °C
    },
    criticalTempThreshold: {
      type: Number,
      default: 38.0 // ASHRAE Allowable Upper °C
    },
    maxAllowedDelta: {
      type: Number,
      default: 4.5 // Max sudden spike in 10 minutes °C
    },
    anomalySensitivity: {
      type: Number,
      default: 2.5 // Z-score threshold
    },
    autoRecommendation: {
      type: Boolean,
      default: true
    },
    simulatorIntervalMs: {
      type: Number,
      default: 4000
    },
    cloudSyncEnabled: {
      type: Boolean,
      default: false
    },
    updatedBy: {
      type: String,
      default: 'System'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
