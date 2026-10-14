/**
 * ThermalMind Sensor Telemetry Simulator
 * Generates physically consistent time-series sensor data for data center racks and servers.
 * Supports configurable operational scenarios (normal, thermal drift, sudden spike, cooling degradation).
 */

const SensorReading = require('../models/SensorReading');
const EnergyMeasurement = require('../models/EnergyMeasurement');
const SystemSetting = require('../models/SystemSetting');
const { detectAnomaliesForReading } = require('../ai/anomalyDetector');
const { evaluateAndGenerateRecommendation } = require('../services/recommendationEngine');

// Simulated server topology
const SIMULATED_RACKS = [
  { id: 'RACK-A01', row: 'A', bay: 1, baseTemp: 22.0, servers: 4, coolingCapacityFactor: 1.0 },
  { id: 'RACK-A02', row: 'A', bay: 2, baseTemp: 23.5, servers: 4, coolingCapacityFactor: 1.0 },
  { id: 'RACK-B01', row: 'B', bay: 1, baseTemp: 22.5, servers: 4, coolingCapacityFactor: 0.95 },
  { id: 'RACK-B02', row: 'B', bay: 2, baseTemp: 25.0, servers: 4, coolingCapacityFactor: 0.85 } // High density rack
];

let simulatorInterval = null;
let currentScenario = 'NORMAL'; // 'NORMAL' | 'GRADUAL_RISE' | 'SUDDEN_SPIKE' | 'HIGH_LOAD' | 'COOLING_DEGRADATION' | 'SENSOR_FAULT'
let scenarioStep = 0;
let isRunning = false;
let lastTickTime = null;
let totalReadingsGenerated = 0;

// Internal state tracker per server to model thermal inertia
const serverStates = {};

function initServerStates() {
  for (const rack of SIMULATED_RACKS) {
    for (let s = 1; s <= rack.servers; s++) {
      const serverId = `SRV-${rack.id.split('-')[1]}-0${s}`;
      serverStates[serverId] = {
        temp: rack.baseTemp + (Math.random() * 1.5 - 0.75),
        cpu: 25 + Math.random() * 15,
        fanSpeed: 45,
        powerWatts: 180
      };
    }
  }
}
initServerStates();

function getWorkload(cpu) {
  if (cpu < 20) return 'Idle';
  if (cpu < 50) return 'Low';
  if (cpu < 75) return 'Medium';
  if (cpu < 90) return 'High';
  return 'Critical';
}

/**
 * Execute a single simulation tick across all racks and servers.
 */
async function generateSimulationTick() {
  scenarioStep++;
  const timestamp = new Date();
  const readings = [];
  let totalFacilityItPowerWatts = 0;

  for (const rack of SIMULATED_RACKS) {
    for (let s = 1; s <= rack.servers; s++) {
      const serverId = `SRV-${rack.id.split('-')[1]}-0${s}`;
      const state = serverStates[serverId];

      // Base CPU calculation with smooth oscillation
      let targetCpu = 28 + (s * 6) + Math.sin(scenarioStep * 0.15) * 12 + (Math.random() * 6 - 3);

      // Scenario Modifications
      let scenarioCoolingDegradation = 1.0;
      let injectedTempOffset = 0;
      let isFaultySensor = false;

      switch (currentScenario) {
        case 'GRADUAL_RISE':
          // Slow thermal drift on Rack B02
          if (rack.id === 'RACK-B02') {
            injectedTempOffset = Math.min(14.0, scenarioStep * 0.45);
          }
          break;

        case 'SUDDEN_SPIKE':
          // Acute temperature spike on server SRV-A02-02
          if (serverId === 'SRV-A02-02') {
            targetCpu = 95.0;
            injectedTempOffset = 11.5;
          }
          break;

        case 'HIGH_LOAD':
          // High cluster workload across all servers
          targetCpu = Math.min(98, targetCpu + 45);
          break;

        case 'COOLING_DEGRADATION':
          // Chiller/fan degradation on Rack B01 and B02
          if (rack.row === 'B') {
            scenarioCoolingDegradation = 0.45; // 55% loss of cooling
            injectedTempOffset = Math.min(12.0, scenarioStep * 0.35);
          }
          break;

        case 'SENSOR_FAULT':
          // Erroneous negative or out-of-bound sensor reading on SRV-A01-04
          if (serverId === 'SRV-A01-04' && scenarioStep % 3 === 0) {
            isFaultySensor = true;
          }
          break;

        case 'NORMAL':
        default:
          break;
      }

      // Smooth CPU transition (inertia)
      targetCpu = Math.min(99, Math.max(5, targetCpu));
      state.cpu = Math.round((state.cpu * 0.65 + targetCpu * 0.35) * 10) / 10;

      // Realistic server power: idle ~130W + max 320W dynamic CPU component
      const targetPower = 130 + (state.cpu / 100) * 320 + (Math.random() * 10 - 5);
      state.powerWatts = Math.round(targetPower);
      totalFacilityItPowerWatts += state.powerWatts;

      // Closed-loop PID fan speed response (fan spins up as CPU and temp rise)
      const targetFan = Math.min(100, Math.max(30, 35 + (state.cpu * 0.4) + (state.temp > 28 ? (state.temp - 28) * 4 : 0)));
      state.fanSpeed = Math.round(state.fanSpeed * 0.7 + targetFan * 0.3);

      // Thermal Physics Model:
      // Heat generation proportional to IT power
      const heatFlux = (state.powerWatts / 450) * 15.0;
      // Heat dissipation proportional to fan airflow * rack cooling capacity
      const heatDissipated = (state.fanSpeed / 100) * 11.0 * rack.coolingCapacityFactor * scenarioCoolingDegradation;
      // Ambient rack heat equilibrium
      const equilibriumTemp = rack.baseTemp + heatFlux - heatDissipated + injectedTempOffset;

      // Thermal inertia: temperature moves toward equilibrium with damping
      state.temp = Math.round((state.temp * 0.82 + equilibriumTemp * 0.18 + (Math.random() * 0.3 - 0.15)) * 10) / 10;

      let coolingStatus = 'Optimal';
      if (state.temp >= 38.0) coolingStatus = 'Critical';
      else if (state.temp >= 32.0) coolingStatus = 'Warning';
      else if (state.temp >= 27.0) coolingStatus = 'Active';

      let recordedTemp = state.temp;
      let validationStatus = 'VALID';
      let rejectionReason = null;

      if (isFaultySensor) {
        recordedTemp = -25.0; // Clearly physically implausible temperature
        validationStatus = 'INVALID';
        rejectionReason = 'Temperature -25°C is below physical sensor threshold (-10°C)';
      }

      readings.push({
        timestamp,
        dataCenterId: 'DC-EAST-01',
        rackId: rack.id,
        serverId,
        temperature: recordedTemp,
        humidity: Math.round((48 + Math.cos(scenarioStep * 0.1) * 4 + (Math.random() * 1.5 - 0.75)) * 10) / 10,
        cpuUtilization: state.cpu,
        workload: getWorkload(state.cpu),
        powerWatts: state.powerWatts,
        coolingStatus,
        fanSpeed: state.fanSpeed,
        dataSource: 'synthetic_simulation',
        validationStatus,
        rejectionReason
      });
    }
  }

  // Insert readings into MongoDB
  const savedReadings = await SensorReading.insertMany(readings);
  totalReadingsGenerated += savedReadings.length;
  lastTickTime = timestamp;

  // Record aggregate facility energy measurement
  const totalItKw = Math.round((totalFacilityItPowerWatts / 1000) * 100) / 100;
  // Estimated cooling power ~ 35% of IT power in modern efficient CRAC facility (PUE ~1.35)
  const estimatedCoolingKw = Math.round((totalItKw * 0.34) * 100) / 100;
  const totalFacilityKw = Math.round((totalItKw + estimatedCoolingKw + 2.5) * 100) / 100; // +2.5kW lighting/distribution
  const instantaneousPue = totalItKw > 0 ? Math.round((totalFacilityKw / totalItKw) * 1000) / 1000 : 1.25;

  // Derived kWh for a 4-second period: kW * (4 / 3600) hrs
  const energyKwh = Math.round((totalFacilityKw * (4 / 3600)) * 10000) / 10000;

  await EnergyMeasurement.create({
    timestamp,
    dataCenterId: 'DC-EAST-01',
    totalServerPowerKw: totalItKw,
    estimatedCoolingPowerKw: estimatedCoolingKw,
    totalFacilityPowerKw: totalFacilityKw,
    instantaneousPue,
    energyConsumedKwh: energyKwh,
    isEstimated: true
  });

  // Evaluate each valid reading for anomalies and recommendations
  for (const reading of savedReadings) {
    if (reading.validationStatus === 'VALID') {
      try {
        const anomaly = await detectAnomaliesForReading(reading);
        if (anomaly) {
          await evaluateAndGenerateRecommendation(anomaly, reading);
        }
      } catch (err) {
        // Continue simulation even if single anomaly evaluation has an issue
      }
    }
  }

  return {
    timestamp,
    readingsCount: savedReadings.length,
    scenario: currentScenario,
    totalFacilityKw,
    instantaneousPue
  };
}

function startSimulator(intervalMs = 4000) {
  if (isRunning) return;
  isRunning = true;
  scenarioStep = 0;
  console.log(`[SIMULATOR] Sensor simulator started (interval: ${intervalMs}ms, scenario: ${currentScenario})`);

  simulatorInterval = setInterval(async () => {
    try {
      await generateSimulationTick();
    } catch (err) {
      console.error('[SIMULATOR] Error during tick:', err.message);
    }
  }, intervalMs);
}

function stopSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  isRunning = false;
  console.log('[SIMULATOR] Sensor simulator stopped.');
}

function setScenario(newScenario) {
  currentScenario = newScenario;
  scenarioStep = 0;
  console.log(`[SIMULATOR] Switched operational scenario to: ${newScenario}`);
}

function getSimulatorStatus() {
  return {
    isRunning,
    currentScenario,
    scenarioStep,
    lastTickTime,
    totalReadingsGenerated,
    availableScenarios: [
      { id: 'NORMAL', name: 'Normal Operating Conditions', description: 'Optimal cooling, balanced workload, temperatures 22-26°C' },
      { id: 'GRADUAL_RISE', name: 'Gradual Thermal Drift', description: 'CRAC airflow restriction on Rack B02 causing slow thermal buildup' },
      { id: 'SUDDEN_SPIKE', name: 'Sudden Thermal Spike', description: 'Acute heat spike on SRV-A02-02 due to sudden batch workload compute' },
      { id: 'HIGH_LOAD', name: 'High Computational Load', description: 'Data center wide 90%+ CPU utilization driving elevated power and fans' },
      { id: 'COOLING_DEGRADATION', name: 'Cooling System Degradation', description: '55% loss of cooling efficiency on Row B with rising temperatures' },
      { id: 'SENSOR_FAULT', name: 'Sensor Fault / Out of Bounds', description: 'Erroneous -25°C telemetry demonstrating data engineering validation' }
    ]
  };
}

module.exports = {
  startSimulator,
  stopSimulator,
  setScenario,
  getSimulatorStatus,
  generateSimulationTick
};
