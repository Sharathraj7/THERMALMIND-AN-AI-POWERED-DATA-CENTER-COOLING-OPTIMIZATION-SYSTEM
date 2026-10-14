const mongoose = require('mongoose');

const rackSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    dataCenterId: {
      type: String,
      required: true,
      default: 'DC-EAST-01'
    },
    row: {
      type: String,
      required: true
    },
    bay: {
      type: Number,
      required: true
    },
    warningTempThreshold: {
      type: Number,
      default: 32.0 // ASHRAE recommended warning limit
    },
    criticalTempThreshold: {
      type: Number,
      default: 38.0 // ASHRAE allowable critical threshold
    },
    targetAirflowCfm: {
      type: Number,
      default: 1800
    },
    totalServers: {
      type: Number,
      default: 4
    },
    status: {
      type: String,
      enum: ['Optimal', 'Warning', 'Critical'],
      default: 'Optimal'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rack', rackSchema);
