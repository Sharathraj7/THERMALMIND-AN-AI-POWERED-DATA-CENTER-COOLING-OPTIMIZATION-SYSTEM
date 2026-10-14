const express = require('express');
const router = express.Router();
const cloudController = require('../controllers/cloudController');
const { authenticateToken } = require('../middleware/auth');

router.get('/status', authenticateToken, cloudController.getCloudStatus);
router.get('/health', cloudController.healthCheck);
router.get('/', cloudController.healthCheck);

module.exports = router;
