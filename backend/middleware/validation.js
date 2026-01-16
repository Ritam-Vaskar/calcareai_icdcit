const { body, param, query, validationResult } = require('express-validator');

// Validation result checker
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Auth validation rules
exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role')
];

exports.loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Patient validation rules
exports.patientValidation = [
  body('name').trim().notEmpty().withMessage('Patient name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Invalid phone number format'),
  body('email').optional().isEmail().normalizeEmail(),
  body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
  body('language').optional().isIn(['english', 'hindi', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati'])
];

// Doctor validation rules
exports.doctorValidation = [
  body('name').trim().notEmpty().withMessage('Doctor name is required'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// Appointment validation rules
exports.appointmentValidation = [
  body('patient').notEmpty().withMessage('Patient ID is required')
    .isMongoId().withMessage('Invalid patient ID'),
  body('doctor').notEmpty().withMessage('Doctor ID is required')
    .isMongoId().withMessage('Invalid doctor ID'),
  body('appointmentDate').notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('appointmentTime').notEmpty().withMessage('Appointment time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)')
];

// Follow-up validation rules
exports.followUpValidation = [
  body('patient').notEmpty().withMessage('Patient ID is required')
    .isMongoId().withMessage('Invalid patient ID'),
  body('type').notEmpty().withMessage('Follow-up type is required')
    .isIn(['post-visit', 'chronic-care', 'post-surgery', 'medication-reminder', 'test-results', 'general']),
  body('scheduledDate').notEmpty().withMessage('Scheduled date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('purpose').trim().notEmpty().withMessage('Purpose is required')
];

// ID param validation
exports.validateId = [
  param('id').isMongoId().withMessage('Invalid ID format')
];
