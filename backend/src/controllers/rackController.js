/**
 * ThermalMind Rack and Server Management Controller
 */

const Rack = require('../models/Rack');
const Server = require('../models/Server');
const SensorReading = require('../models/SensorReading');

async function getAllRacks(req, res, next) {
  try {
    const racks = await Rack.find().sort({ row: 1, bay: 1 }).lean();

    // Query latest readings for each server
    const latestReadings = await SensorReading.aggregate([
      { $match: { validationStatus: 'VALID' } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$serverId',
          latest: { $first: '$$ROOT' }
        }
      }
    ]);

    const readingMap = {};
    latestReadings.forEach(item => {
      readingMap[item._id] = item.latest;
    });

    const enrichedRacks = await Promise.all(
      racks.map(async rack => {
        const servers = await Server.find({ rackId: rack.id }).lean();
        let maxTemp = 0;
        let sumTemp = 0;
        let totalPower = 0;
        let sumCpu = 0;
        let criticalServers = 0;

        const enrichedServers = servers.map(srv => {
          const telemetry = readingMap[srv.id] || {
            temperature: rack.row === 'B' ? 26.5 : 23.0,
            cpuUtilization: 35,
            powerWatts: 210,
            fanSpeed: 50,
            coolingStatus: 'Optimal',
            workload: 'Low',
            timestamp: new Date()
          };

          if (telemetry.temperature > maxTemp) maxTemp = telemetry.temperature;
          sumTemp += telemetry.temperature;
          totalPower += telemetry.powerWatts;
          sumCpu += telemetry.cpuUtilization;
          if (telemetry.temperature >= (rack.criticalTempThreshold || 38)) criticalServers++;

          return {
            ...srv,
            telemetry
          };
        });

        const count = servers.length || 1;
        const avgTemp = Math.round((sumTemp / count) * 10) / 10;
        const avgCpu = Math.round((sumCpu / count) * 10) / 10;

        let thermalStatus = 'Optimal';
        if (maxTemp >= (rack.criticalTempThreshold || 38)) thermalStatus = 'Critical';
        else if (maxTemp >= (rack.warningTempThreshold || 32)) thermalStatus = 'Warning';
        else if (avgTemp >= 27) thermalStatus = 'Active';

        return {
          ...rack,
          avgTemperature: avgTemp,
          maxTemperature: Math.round(maxTemp * 10) / 10,
          totalPowerKw: Math.round((totalPower / 1000) * 100) / 100,
          avgCpuUtilization: avgCpu,
          thermalStatus,
          servers: enrichedServers
        };
      })
    );

    res.json({ success: true, count: enrichedRacks.length, racks: enrichedRacks });
  } catch (err) {
    next(err);
  }
}

async function getRackById(req, res, next) {
  try {
    const rack = await Rack.findOne({ id: req.params.id }).lean();
    if (!rack) {
      return res.status(404).json({ success: false, error: `Rack ${req.params.id} not found.` });
    }

    const servers = await Server.find({ rackId: rack.id }).lean();
    res.json({ success: true, rack: { ...rack, servers } });
  } catch (err) {
    next(err);
  }
}

async function getAllServers(req, res, next) {
  try {
    const servers = await Server.find().sort({ rackId: 1, id: 1 }).lean();

    const latestReadings = await SensorReading.aggregate([
      { $match: { validationStatus: 'VALID' } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$serverId',
          latest: { $first: '$$ROOT' }
        }
      }
    ]);

    const readingMap = {};
    latestReadings.forEach(item => {
      readingMap[item._id] = item.latest;
    });

    const enrichedServers = servers.map(srv => {
      const telemetry = readingMap[srv.id] || {
        temperature: 23.5,
        cpuUtilization: 30,
        powerWatts: 190,
        fanSpeed: 45,
        coolingStatus: 'Optimal',
        workload: 'Low',
        timestamp: new Date()
      };

      let riskCategory = 'Normal';
      if (telemetry.temperature >= 38) riskCategory = 'Critical';
      else if (telemetry.temperature >= 34) riskCategory = 'High Risk';
      else if (telemetry.temperature >= 30) riskCategory = 'Medium Risk';
      else if (telemetry.temperature >= 26) riskCategory = 'Low Risk';

      return {
        ...srv,
        riskCategory,
        telemetry
      };
    });

    res.json({ success: true, count: enrichedServers.length, servers: enrichedServers });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRacks,
  getRackById,
  getAllServers
};
