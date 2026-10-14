/**
 * ThermalMind Authentication & Role-Based Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token is required to access this resource.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive or no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User is not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role "${req.user.role}" does not have permission to perform this action. Required: ${allowedRoles.join(' or ')}.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
