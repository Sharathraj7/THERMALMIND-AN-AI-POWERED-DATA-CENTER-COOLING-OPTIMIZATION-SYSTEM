const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    dataCenterId: {
      type: String,
      required: true,
      default: 'DC-EAST-01',
      index: true
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
    temperature: {
      type: Number,
      required: true // Degrees Celsius
    },
    humidity: {
      type: Number,
      default: 45.0 // Percentage
    },
    cpuUtilization: {
      type: Number,
      required: true // Percentage 0-100
    },
    workload: {
      type: String,
      enum: ['Idle', 'Low', 'Medium', 'High', 'Critical'],
      default: 'Low'
    },
    powerWatts: {
      type: Number,
      required: true // Watts
    },
    coolingStatus: {
      type: String,
      enum: ['Optimal', 'Active', 'Warning', 'Degraded', 'Critical', 'Failed'],
      default: 'Optimal'
    },
    fanSpeed: {
      type: Number,
      default: 50.0 // Percentage 0-100
    },
    dataSource: {
      type: String,
      enum: ['historical_import', 'synthetic_simulation', 'csv_upload', 'realtime_sensor'],
      default: 'synthetic_simulation'
    },
    validationStatus: {
      type: String,
      enum: ['VALID', 'INVALID', 'SUSPECT', 'DUPLICATE'],
      default: 'VALID'
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Compound indexes for high-performance time-series queries
sensorReadingSchema.index({ rackId: 1, timestamp: -1 });
sensorReadingSchema.index({ serverId: 1, timestamp: -1 });
sensorReadingSchema.index({ timestamp: -1, validationStatus: 1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
