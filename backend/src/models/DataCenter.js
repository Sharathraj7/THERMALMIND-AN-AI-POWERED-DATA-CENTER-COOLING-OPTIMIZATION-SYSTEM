const mongoose = require('mongoose');

const dataCenterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    totalRacks: {
      type: Number,
      default: 4
    },
    maxCapacityKw: {
      type: Number,
      default: 1200
    },
    targetPue: {
      type: Number,
      default: 1.2
    },
    coolingType: {
      type: String,
      default: 'Indirect Evaporative + Chilled Water CRAC'
    },
    status: {
      type: String,
      enum: ['Optimal', 'Warning', 'Critical', 'Maintenance'],
      default: 'Optimal'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DataCenter', dataCenterSchema);
