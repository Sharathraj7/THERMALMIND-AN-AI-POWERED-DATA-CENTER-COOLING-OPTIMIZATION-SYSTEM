/**
 * ThermalMind Authentication Controller
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { loginSchema, createUserSchema } = require('../validators/schemas');
const { logAuditEvent } = require('../audit/auditLogger');

let failedLoginAttempts = 0;

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { email, password } = value;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      failedLoginAttempts++;
      await logAuditEvent({
        action: 'FAILED_LOGIN_ATTEMPT',
        module: 'AUTH',
        userId: user ? user._id : 'unknown',
        userEmail: email,
        userRole: user ? user.role : 'Unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        status: 'FAILURE',
        details: { reason: 'Invalid credentials provided' }
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    await logAuditEvent({
      action: 'USER_LOGIN_SUCCESS',
      module: 'AUTH',
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getCurrentUser(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAuditEvent({
        action: 'USER_LOGOUT',
        module: 'AUTH',
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'SUCCESS'
      });
    }
    res.json({ success: true, message: 'Successfully logged out.' });
  } catch (err) {
    next(err);
  }
}

function getFailedLoginCount() {
  return failedLoginAttempts;
}

module.exports = {
  login,
  getCurrentUser,
  logout,
  getFailedLoginCount
};
