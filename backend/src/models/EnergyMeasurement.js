const mongoose = require('mongoose');

const energyMeasurementSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    dataCenterId: {
      type: String,
      required: true,
      default: 'DC-EAST-01'
    },
    rackId: {
      type: String,
      default: null,
      index: true
    },
    totalServerPowerKw: {
      type: Number,
      required: true // IT equipment power
    },
    estimatedCoolingPowerKw: {
      type: Number,
      required: true // CRAC, Chiller, fans
    },
    totalFacilityPowerKw: {
      type: Number,
      required: true // Total facility power = IT + Cooling + Losses
    },
    instantaneousPue: {
      type: Number,
      required: true // PUE = Total Facility / IT Power
    },
    energyConsumedKwh: {
      type: Number,
      required: true // Derived mathematically from power (kW) * time interval (hrs)
    },
    isEstimated: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EnergyMeasurement', energyMeasurementSchema);
