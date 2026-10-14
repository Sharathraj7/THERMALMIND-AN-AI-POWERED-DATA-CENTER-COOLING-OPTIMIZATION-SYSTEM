/**
 * ThermalMind Sensor Telemetry & Data Engineering Controller
 */

const SensorReading = require('../models/SensorReading');
const IngestionJob = require('../models/IngestionJob');
const { validateSensorRecord } = require('../data-engineering/validator');
const { ingestCsv } = require('../data-engineering/csvImporter');
const {
  startSimulator,
  stopSimulator,
  setScenario,
  getSimulatorStatus,
  generateSimulationTick
} = require('../data-engineering/simulator');
const { simulatorControlSchema } = require('../validators/schemas');
const { logAuditEvent } = require('../audit/auditLogger');

async function getSensors(req, res, next) {
  try {
    const { rackId, serverId, validationStatus, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (rackId && rackId !== 'ALL') filter.rackId = rackId;
    if (serverId && serverId !== 'ALL') filter.serverId = serverId;
    if (validationStatus && validationStatus !== 'ALL') filter.validationStatus = validationStatus;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await SensorReading.countDocuments(filter);
    const readings = await SensorReading.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit) || 1,
      readings
    });
  } catch (err) {
    next(err);
  }
}

async function getSensorById(req, res, next) {
  try {
    const reading = await SensorReading.findById(req.params.id);
    if (!reading) {
      return res.status(404).json({ success: false, error: 'Sensor reading not found' });
    }
    res.json({ success: true, reading });
  } catch (err) {
    next(err);
  }
}

async function getSensorHistory(req, res, next) {
  try {
    const { serverId = 'SRV-A01-01', limit = 60 } = req.query;
    const history = await SensorReading.find({ serverId, validationStatus: 'VALID' })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      serverId,
      count: history.length,
      history: history.reverse()
    });
  } catch (err) {
    next(err);
  }
}

async function ingestSingle(req, res, next) {
  try {
    const validation = validateSensorRecord(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        reason: validation.reason
      });
    }

    const saved = await SensorReading.create({
      ...validation.sanitized,
      validationStatus: validation.status,
      rejectionReason: validation.reason,
      dataSource: req.body.dataSource || 'realtime_sensor'
    });

    res.status(201).json({ success: true, reading: saved });
  } catch (err) {
    next(err);
  }
}

async function uploadCsvFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file was uploaded.' });
    }

    const filename = req.file.originalname || 'uploaded_telemetry.csv';
    const job = await ingestCsv(req.file.buffer, {
      filename,
      user: req.user,
      dataSource: 'csv_upload'
    });

    res.status(201).json({
      success: true,
      message: `CSV Ingestion finished: ${job.validRecords} valid records saved.`,
      job
    });
  } catch (err) {
    next(err);
  }
}

async function getIngestionStats(req, res, next) {
  try {
    const totalRecords = await SensorReading.countDocuments();
    const validRecords = await SensorReading.countDocuments({ validationStatus: 'VALID' });
    const invalidRecords = await SensorReading.countDocuments({ validationStatus: 'INVALID' });
    const suspectRecords = await SensorReading.countDocuments({ validationStatus: 'SUSPECT' });

    // Aggregate duplicate & missing value counts from all jobs
    const jobs = await IngestionJob.find().sort({ createdAt: -1 }).limit(10).lean();

    let totalDuplicates = 0;
    let totalMissingValues = 0;
    jobs.forEach(j => {
      totalDuplicates += j.duplicateRecords || 0;
      totalMissingValues += j.missingValuesDetected || 0;
    });

    const simulatorStatus = getSimulatorStatus();

    res.json({
      success: true,
      stats: {
        totalRecords,
        validRecords,
        invalidRecords,
        suspectRecords,
        duplicateRecords: totalDuplicates,
        missingValuesDetected: totalMissingValues
      },
      simulator: simulatorStatus,
      recentJobs: jobs
    });
  } catch (err) {
    next(err);
  }
}

async function controlSimulatorEndpoint(req, res, next) {
  try {
    const { error, value } = simulatorControlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { action, scenario, intervalMs } = value;

    if (action === 'start') {
      startSimulator(intervalMs || 4000);
      await logAuditEvent({
        action: 'START_SENSOR_SIMULATOR',
        module: 'INGESTION',
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        details: { intervalMs: intervalMs || 4000, scenario },
        status: 'SUCCESS'
      });
    } else if (action === 'stop') {
      stopSimulator();
      await logAuditEvent({
        action: 'STOP_SENSOR_SIMULATOR',
        module: 'INGESTION',
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'SUCCESS'
      });
    } else if (action === 'set_scenario') {
      setScenario(scenario);
      await logAuditEvent({
        action: 'CHANGE_SIMULATOR_SCENARIO',
        module: 'INGESTION',
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        details: { scenario },
        status: 'SUCCESS'
      });
    } else if (action === 'step') {
      const result = await generateSimulationTick();
      return res.json({
        success: true,
        message: 'Generated 1 simulation tick across all racks.',
        tick: result,
        simulator: getSimulatorStatus()
      });
    }

    res.json({
      success: true,
      message: `Simulator ${action} executed successfully.`,
      simulator: getSimulatorStatus()
    });
  } catch (err) {
    next(err);
  }
}

async function getSimulatorStatusEndpoint(req, res) {
  res.json({
    success: true,
    simulator: getSimulatorStatus()
  });
}

module.exports = {
  getSensors,
  getSensorById,
  getSensorHistory,
  ingestSingle,
  uploadCsvFile,
  getIngestionStats,
  controlSimulatorEndpoint,
  getSimulatorStatusEndpoint
};
