/**
 * ThermalMind Server Entry Point
 * Initializes database, auto-seeds demonstration data if empty, and starts HTTP API server.
 */

const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const { startSimulator, stopSimulator } = require('./data-engineering/simulator');
const seedDatabase = require('../../scripts/seedDatabase');

let server = null;

async function bootstrap() {
  try {
    console.log('----------------------------------------------------');
    console.log('   THERMALMIND: AI-POWERED DC COOLING OPTIMIZATION  ');
    console.log('----------------------------------------------------');

    // 1. Connect to Database (External or In-Memory fallback)
    await connectDB();

    // 2. Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[SERVER] Database is empty. Running auto-initialization seed...');
      await seedDatabase({ keepConnectionOpen: true });
    } else {
      console.log(`[SERVER] Verified existing database records (${userCount} users found).`);
    }

    // 3. Start Sensor Telemetry Simulator (Normal mode, 4-second interval)
    startSimulator(config.simulatorIntervalMs || 4000);

    // 4. Start HTTP Server
    server = app.listen(config.port, () => {
      console.log(`[SERVER] ThermalMind API server running on port ${config.port}`);
      console.log(`[SERVER] Environment: ${config.env}`);
      console.log(`[SERVER] Health endpoint: http://localhost:${config.port}/api/health`);
      console.log(`[SERVER] Documentation & Status: http://localhost:${config.port}/api/cloud/status`);
      console.log('----------------------------------------------------');
    });

  } catch (err) {
    console.error('[SERVER FATAL ERROR]', err.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function handleShutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Initiating graceful shutdown...`);
  stopSimulator();

  if (server) {
    server.close(() => {
      console.log('[SERVER] HTTP server closed.');
    });
  }

  await disconnectDB();
  console.log('[SERVER] Shutdown complete. Goodbye.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

bootstrap();
