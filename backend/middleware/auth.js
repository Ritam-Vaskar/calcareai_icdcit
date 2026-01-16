const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Verify webhook signature (for Vapi)
exports.verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-vapi-signature'];
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('Webhook secret not configured');
    return next();
  }
  
  if (!signature) {
    return res.status(401).json({
      success: false,
      message: 'Missing webhook signature'
    });
  }
  
  // In production, implement proper HMAC verification
  // For now, simple comparison
  if (signature !== webhookSecret) {
    logger.warn('Invalid webhook signature received');
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature'
    });
  }
  
  next();
};
