const Doctor = require('../models/Doctor');
const logger = require('../utils/logger');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private
exports.getDoctors = async (req, res, next) => {
  try {
    const { search, specialization, status, page = 1, limit = 10 } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (specialization) query.specialization = { $regex: specialization, $options: 'i' };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await Doctor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      success: true,
      count: doctors.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: { doctors }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Private
exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create doctor
// @route   POST /api/doctors
// @access  Private/Admin
exports.createDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.create(req.body);

    logger.info('Doctor created', { doctorId: doctor._id, name: doctor.name });
    logger.audit('DOCTOR_CREATED', req.user.email, { 
      doctorId: doctor._id,
      doctorName: doctor.name 
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private/Admin
exports.updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    logger.info('Doctor updated', { doctorId: doctor._id });
    logger.audit('DOCTOR_UPDATED', req.user.email, { 
      doctorId: doctor._id,
      doctorName: doctor.name 
    });

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.status = 'inactive';
    await doctor.save();

    logger.info('Doctor deleted/deactivated', { doctorId: doctor._id });
    logger.audit('DOCTOR_DELETED', req.user.email, { 
      doctorId: doctor._id,
      doctorName: doctor.name 
    });

    res.status(200).json({
      success: true,
      message: 'Doctor deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor availability
// @route   GET /api/doctors/:id/availability
// @access  Private
exports.getDoctorAvailability = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { availability: doctor.availability }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor availability
// @route   PUT /api/doctors/:id/availability
// @access  Private/Admin
exports.updateDoctorAvailability = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.availability = { ...doctor.availability, ...req.body };
    await doctor.save();

    logger.info('Doctor availability updated', { doctorId: doctor._id });

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability: doctor.availability }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate available slots for a doctor
// @route   GET /api/doctors/:id/slots
// @access  Private
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const dayOfWeek = new Date(date).getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayOfWeek];

    const availability = doctor.availability[dayName];

    if (!availability.isAvailable || !availability.slots.length) {
      return res.status(200).json({
        success: true,
        data: { slots: [] },
        message: 'No slots available for this day'
      });
    }

    res.status(200).json({
      success: true,
      data: { slots: availability.slots }
    });
  } catch (error) {
    next(error);
  }
};
