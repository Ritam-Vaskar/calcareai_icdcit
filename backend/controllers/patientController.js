const Patient = require('../models/Patient');
const logger = require('../utils/logger');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res, next) => {
  try {
    const { search, language, status, doctor, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (language) query.language = language;
    if (status) query.status = status;
    if (doctor) query.assignedDoctor = doctor;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const patients = await Patient.find(query)
      .populate('assignedDoctor', 'name specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      count: patients.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: { patients }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name specialization phone email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res, next) => {
  try {
    const patient = await Patient.create(req.body);

    logger.info('Patient created', { patientId: patient._id, name: patient.name });
    logger.audit('PATIENT_CREATED', req.user.email, { 
      patientId: patient._id,
      patientName: patient.name 
    });

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedDoctor', 'name specialization');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    logger.info('Patient updated', { patientId: patient._id });
    logger.audit('PATIENT_UPDATED', req.user.email, { 
      patientId: patient._id,
      patientName: patient.name 
    });

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private/Admin
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Soft delete - mark as archived
    patient.status = 'archived';
    await patient.save();

    logger.info('Patient deleted/archived', { patientId: patient._id });
    logger.audit('PATIENT_DELETED', req.user.email, { 
      patientId: patient._id,
      patientName: patient.name 
    });

    res.status(200).json({
      success: true,
      message: 'Patient archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient statistics
// @route   GET /api/patients/stats
// @access  Private
exports.getPatientStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments({ status: 'active' });
    const byLanguage = await Patient.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ]);
    const byGender = await Patient.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        byLanguage,
        byGender
      }
    });
  } catch (error) {
    next(error);
  }
};
