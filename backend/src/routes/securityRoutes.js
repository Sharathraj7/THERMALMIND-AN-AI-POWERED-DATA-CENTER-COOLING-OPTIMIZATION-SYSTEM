const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/status', authenticateToken, securityController.getSecurityOverview);
router.get('/audit-logs', authenticateToken, requireRole('Administrator'), securityController.getAuditLogsEndpoint);

module.exports = router;
