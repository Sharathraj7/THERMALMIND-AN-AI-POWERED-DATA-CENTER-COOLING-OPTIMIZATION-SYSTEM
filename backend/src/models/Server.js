const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    rackId: {
      type: String,
      required: true,
      ref: 'Rack'
    },
    dataCenterId: {
      type: String,
      required: true,
      default: 'DC-EAST-01'
    },
    hostname: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    cpuModel: {
      type: String,
      default: 'AMD EPYC 9654 96-Core Processor'
    },
    cores: {
      type: Number,
      default: 96
    },
    tdpWatts: {
      type: Number,
      default: 360
    },
    status: {
      type: String,
      enum: ['Normal', 'Warning', 'Critical', 'Offline'],
      default: 'Normal'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Server', serverSchema);
