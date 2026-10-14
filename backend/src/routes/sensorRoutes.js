const express = require('express');
const router = express.Router();
const multer = require('multer');
const sensorController = require('../controllers/sensorController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { heavyJobLimiter } = require('../middleware/rateLimiter');

// Configure multer for CSV uploads (in memory buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed for upload.'));
    }
  }
});

router.get('/', authenticateToken, sensorController.getSensors);
router.get('/history', authenticateToken, sensorController.getSensorHistory);
router.get('/ingestion-stats', authenticateToken, sensorController.getIngestionStats);
router.get('/simulator/status', authenticateToken, sensorController.getSimulatorStatusEndpoint);
router.post('/simulator', authenticateToken, requireRole('Administrator'), sensorController.controlSimulatorEndpoint);
router.post('/upload-csv', authenticateToken, heavyJobLimiter, upload.single('file'), sensorController.uploadCsvFile);
router.post('/ingest', authenticateToken, sensorController.ingestSingle);
router.get('/:id', authenticateToken, sensorController.getSensorById);

module.exports = router;
