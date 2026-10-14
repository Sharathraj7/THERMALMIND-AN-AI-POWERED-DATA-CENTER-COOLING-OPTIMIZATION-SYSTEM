/**
 * ThermalMind Facility Risk Assessment & Thermal Health Index
 * Evaluates facility-wide thermal risks, rack hotspot likelihood, and correlation analysis.
 */

const SensorReading = require('../models/SensorReading');
const AnomalyEvent = require('../models/AnomalyEvent');
const Rack = require('../models/Rack');

/**
 * Calculates Pearson correlation coefficient between two numeric arrays.
 */
function calculatePearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

/**
 * Generates comprehensive risk assessment metrics for the entire facility.
 */
async function generateRiskAssessment() {
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

  const racks = await Rack.find().lean();
  const rackMap = {};
  for (const r of racks) {
    rackMap[r.id] = { ...r, servers: [], maxTemp: 0, avgTemp: 0, totalPower: 0, avgCpu: 0 };
  }

  const riskCounts = {
    Normal: 0,
    'Low Risk': 0,
    'Medium Risk': 0,
    'High Risk': 0,
    Critical: 0
  };

  const temps = [];
  const cpus = [];
  const powers = [];

  for (const item of latestReadings) {
    const r = item.latest;
    temps.push(r.temperature);
    cpus.push(r.cpuUtilization);
    powers.push(r.powerWatts);

    // Classify risk category
    let risk = 'Normal';
    if (r.temperature >= 38.0) risk = 'Critical';
    else if (r.temperature >= 35.0) risk = 'High Risk';
    else if (r.temperature >= 32.0) risk = 'Medium Risk';
    else if (r.temperature >= 28.0) risk = 'Low Risk';

    riskCounts[risk]++;

    if (rackMap[r.rackId]) {
      rackMap[r.rackId].servers.push(r);
      rackMap[r.rackId].maxTemp = Math.max(rackMap[r.rackId].maxTemp, r.temperature);
      rackMap[r.rackId].totalPower += r.powerWatts;
    }
  }

  // Calculate per-rack aggregated stats
  const rackRisks = Object.values(rackMap).map(rack => {
    const srvCount = rack.servers.length || 1;
    const avgTemp = rack.servers.reduce((acc, s) => acc + s.temperature, 0) / srvCount;
    const avgCpu = rack.servers.reduce((acc, s) => acc + s.cpuUtilization, 0) / srvCount;

    let riskLevel = 'Normal';
    if (rack.maxTemp >= (rack.criticalTempThreshold || 38)) riskLevel = 'Critical';
    else if (rack.maxTemp >= (rack.warningTempThreshold || 32)) riskLevel = 'High Risk';
    else if (avgTemp >= 28) riskLevel = 'Medium Risk';
    else if (avgTemp >= 25) riskLevel = 'Low Risk';

    return {
      rackId: rack.id,
      row: rack.row,
      bay: rack.bay,
      riskLevel,
      maxTemp: Math.round(rack.maxTemp * 10) / 10,
      avgTemp: Math.round(avgTemp * 10) / 10,
      totalPowerWatts: rack.totalPower,
      avgCpuUtilization: Math.round(avgCpu * 10) / 10,
      serverCount: rack.servers.length,
      warningLimit: rack.warningTempThreshold || 32,
      criticalLimit: rack.criticalTempThreshold || 38,
      isApproachingLimit: rack.maxTemp >= (rack.warningTempThreshold || 32)
    };
  });

  // Facility-wide Pearson correlations
  const cpuTempCorrelation = calculatePearsonCorrelation(cpus, temps);
  const powerTempCorrelation = calculatePearsonCorrelation(powers, temps);
  const cpuPowerCorrelation = calculatePearsonCorrelation(cpus, powers);

  // Facility Thermal Health Index (0 - 100):
  // 100 is pristine; deductions for servers in Medium, High, and Critical risk
  const totalServers = latestReadings.length || 1;
  const healthDeductions =
    (riskCounts['Low Risk'] * 2 +
      riskCounts['Medium Risk'] * 8 +
      riskCounts['High Risk'] * 20 +
      riskCounts['Critical'] * 35) / totalServers;

  const thermalHealthIndex = Math.max(0, Math.min(100, Math.round(100 - healthDeductions)));

  return {
    thermalHealthIndex,
    riskDistribution: riskCounts,
    totalServersMonitored: latestReadings.length,
    rackRisks,
    correlations: {
      cpuVsTemperature: {
        r: cpuTempCorrelation,
        interpretation: cpuTempCorrelation > 0.6
          ? 'Strong positive correlation: Server heat is primarily driven by active computational workload.'
          : 'Moderate/Weak correlation: Heat accumulation suggests cooling airflow or environmental factors.'
      },
      powerVsTemperature: {
        r: powerTempCorrelation,
        interpretation: 'Power dissipation directly correlates with heat generation envelope.'
      },
      cpuVsPower: {
        r: cpuPowerCorrelation,
        interpretation: 'Server dynamic power scaling is responsive to compute utilization.'
      }
    }
  };
}

module.exports = {
  generateRiskAssessment,
  calculatePearsonCorrelation
};
