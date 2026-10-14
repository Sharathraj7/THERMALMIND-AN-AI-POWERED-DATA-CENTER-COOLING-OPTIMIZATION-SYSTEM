/**
 * ThermalMind Database Connection Manager
 * Supports connection to external MongoDB or transparent in-memory MongoDB fallback
 * for zero-setup execution and demonstration environments.
 */

const mongoose = require('mongoose');
const config = require('./env');

let mongoMemoryServerInstance = null;
let dbStatus = {
  connected: false,
  mode: 'disconnected',
  uri: '',
  host: '',
  database: '',
  connectedAt: null,
  error: null
};

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return dbStatus;
  }

  // 1. Try external MongoDB if configured and not explicitly forced in-memory
  if (config.useInMemoryDb !== 'true') {
    try {
      console.log(`[DB] Attempting connection to MongoDB at: ${config.mongodbUri} ...`);
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 3000
      });

      dbStatus = {
        connected: true,
        mode: 'External MongoDB (Configured)',
        uri: config.mongodbUri.replace(/:([^:@]+)@/, ':****@'),
        host: mongoose.connection.host || 'localhost',
        database: mongoose.connection.name || 'thermalmind',
        connectedAt: new Date().toISOString(),
        error: null
      };

      console.log(`[DB] Successfully connected to External MongoDB: ${dbStatus.host}/${dbStatus.database}`);
      return dbStatus;
    } catch (err) {
      console.warn(`[DB] External MongoDB connection failed (${err.message}).`);
      if (config.useInMemoryDb === 'false') {
        dbStatus.error = err.message;
        throw err;
      }
      console.log('[DB] Falling back to embedded in-memory MongoDB for local demonstration mode...');
    }
  }

  // 2. Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'thermalmind'
      }
    });

    const memoryUri = mongoMemoryServerInstance.getUri();
    await mongoose.connect(memoryUri);

    dbStatus = {
      connected: true,
      mode: 'Embedded In-Memory MongoDB (Local Demo Mode)',
      uri: memoryUri,
      host: 'localhost (embedded)',
      database: 'thermalmind',
      connectedAt: new Date().toISOString(),
      error: null
    };

    console.log(`[DB] Connected to Embedded In-Memory MongoDB successfully: ${memoryUri}`);
    return dbStatus;
  } catch (memErr) {
    console.error('[DB] Failed to launch MongoMemoryServer:', memErr.message);
    dbStatus.error = memErr.message;
    throw memErr;
  }
}

async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoMemoryServerInstance) {
      await mongoMemoryServerInstance.stop();
      mongoMemoryServerInstance = null;
    }
    dbStatus.connected = false;
    dbStatus.mode = 'disconnected';
    console.log('[DB] Disconnected from database.');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
}

function getDbStatus() {
  return {
    ...dbStatus,
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDbStatus
};
