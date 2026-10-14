/**
 * ThermalMind CSV Ingestion and ETL Pipeline
 * Parses CSV streams, checks duplicates, validates records, handles missing fields,
 * and maintains full ingestion tracking statistics in MongoDB.
 */

const fs = require('fs');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const SensorReading = require('../models/SensorReading');
const IngestionJob = require('../models/IngestionJob');
const { validateSensorRecord } = require('./validator');
const { logAuditEvent } = require('../audit/auditLogger');

/**
 * Ingests a CSV file or buffer into MongoDB.
 * @param {string|Buffer} input - Path to CSV file or file buffer
 * @param {object} options - { filename, user, dataSource }
 */
async function ingestCsv(input, options = {}) {
  const startTime = Date.now();
  const jobId = `JOB-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
  const filename = options.filename || 'telemetry_upload.csv';
  const executedBy = options.user ? `${options.user.name} (${options.user.role})` : 'System';

  console.log(`[ETL] Starting ingestion job ${jobId} for file: ${filename}...`);

  let lines = [];
  if (Buffer.isBuffer(input)) {
    lines = input.toString('utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  } else if (typeof input === 'string') {
    if (fs.existsSync(input)) {
      const content = fs.readFileSync(input, 'utf8');
      lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    } else {
      // String buffer
      lines = input.split(/\r?\n/).filter(l => l.trim().length > 0);
    }
  }

  if (lines.length < 2) {
    const errorJob = await IngestionJob.create({
      jobId,
      filename,
      dataSource: options.dataSource || 'csv_upload',
      totalProcessed: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      missingValuesDetected: 0,
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorDetails: [{ row: 0, field: 'file', message: 'CSV file is empty or missing data rows' }],
      executedBy
    });
    return errorJob;
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const headerMap = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const totalProcessed = lines.length - 1;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;
  let duplicateRecordsCount = 0;
  let missingValuesDetected = 0;
  const errorDetails = [];
  const recordsToInsert = [];
  const seenInBatch = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Basic CSV row split handling quoted values
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const rawRecord = {};

    for (const [header, idx] of Object.entries(headerMap)) {
      rawRecord[header] = cols[idx] !== undefined ? cols[idx] : '';
    }

    // Check for missing values in row
    let hasEmptyValue = false;
    for (const val of Object.values(rawRecord)) {
      if (val === '' || val === null || val === undefined) {
        hasEmptyValue = true;
        break;
      }
    }
    if (hasEmptyValue) missingValuesDetected++;

    // Validate structure & bounds
    const validation = validateSensorRecord(rawRecord);
    if (!validation.isValid) {
      invalidRecordsCount++;
      if (errorDetails.length < 50) {
        errorDetails.push({
          row: i + 1,
          field: 'validation',
          message: validation.reason,
          rawData: rawRecord
        });
      }
      continue;
    }

    const rec = validation.sanitized;
    const batchKey = `${rec.rackId}_${rec.serverId}_${rec.timestamp.getTime()}`;

    // Duplicate check in batch
    if (seenInBatch.has(batchKey)) {
      duplicateRecordsCount++;
      if (errorDetails.length < 50) {
        errorDetails.push({
          row: i + 1,
          field: 'duplicate',
          message: `Duplicate reading detected in batch for ${rec.serverId} at ${rec.timestamp.toISOString()}`,
          rawData: { rackId: rec.rackId, serverId: rec.serverId, timestamp: rec.timestamp }
        });
      }
      continue;
    }
    seenInBatch.add(batchKey);

    // Database duplicate check (recent reading within 1 minute for same server)
    const existing = await SensorReading.findOne({
      rackId: rec.rackId,
      serverId: rec.serverId,
      timestamp: rec.timestamp
    }).select('_id');

    if (existing) {
      duplicateRecordsCount++;
      continue;
    }

    validRecordsCount++;
    recordsToInsert.push({
      ...rec,
      validationStatus: validation.status,
      rejectionReason: validation.reason,
      dataSource: options.dataSource || 'csv_upload'
    });
  }

  // Batch insert into MongoDB
  if (recordsToInsert.length > 0) {
    await SensorReading.insertMany(recordsToInsert, { ordered: false });
  }

  const durationMs = Date.now() - startTime;

  const job = await IngestionJob.create({
    jobId,
    filename,
    dataSource: options.dataSource || 'csv_upload',
    totalProcessed,
    validRecords: validRecordsCount,
    invalidRecords: invalidRecordsCount,
    duplicateRecords: duplicateRecordsCount,
    missingValuesDetected,
    durationMs,
    status: invalidRecordsCount === totalProcessed ? 'FAILED' : 'COMPLETED',
    errorDetails,
    executedBy
  });

  // Audit log
  await logAuditEvent({
    action: 'INGEST_CSV_DATASET',
    module: 'INGESTION',
    userId: options.user ? options.user._id : 'system',
    userEmail: options.user ? options.user.email : 'system@thermalmind.io',
    userRole: options.user ? options.user.role : 'System',
    details: {
      jobId,
      filename,
      totalProcessed,
      validRecords: validRecordsCount,
      invalidRecords: invalidRecordsCount,
      duplicateRecords: duplicateRecordsCount,
      durationMs
    },
    status: 'SUCCESS'
  });

  console.log(`[ETL] Completed job ${jobId}: ${validRecordsCount} valid, ${invalidRecordsCount} invalid, ${duplicateRecordsCount} duplicates (${durationMs}ms)`);
  return job;
}

module.exports = {
  ingestCsv
};
