/**
 * ThermalMind Audit Logging System
 * Records security-sensitive, operational, and data lifecycle actions in MongoDB.
 */

const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event.
 */
async function logAuditEvent({
  action,
  module = 'SYSTEM',
  userId = 'system',
  userEmail = 'system@thermalmind.io',
  userRole = 'System',
  details = {},
  ipAddress = '127.0.0.1',
  status = 'SUCCESS'
}) {
  try {
    const log = await AuditLog.create({
      id: `AUDIT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`,
      timestamp: new Date(),
      userId,
      userEmail,
      userRole,
      action,
      module,
      details,
      ipAddress,
      status
    });
    return log;
  } catch (err) {
    // Non-blocking: audit failure must not crash active transaction
    console.error(`[AUDIT] Failed to persist audit log: ${err.message}`);
    return null;
  }
}

/**
 * Query audit logs with pagination and filters.
 */
async function getAuditLogs({ limit = 50, page = 1, module, action, status } = {}) {
  const query = {};
  if (module && module !== 'ALL') query.module = module;
  if (action) query.action = new RegExp(action, 'i');
  if (status && status !== 'ALL') query.status = status;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return {
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    pages: Math.ceil(total / limit) || 1,
    logs
  };
}

module.exports = {
  logAuditEvent,
  getAuditLogs
};
