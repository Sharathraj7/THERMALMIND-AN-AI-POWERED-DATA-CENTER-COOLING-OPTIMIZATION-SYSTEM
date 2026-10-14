const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, settingsController.getSettings);
router.patch('/', authenticateToken, requireRole('Administrator'), settingsController.updateSettings);

module.exports = router;
