const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const CallLog = require('../models/CallLog');
const vapiService = require('../services/vapiService');
const logger = require('../utils/logger');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    const { 
      patient, 
      doctor, 
      status, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {};
    
    if (patient) query.patient = patient;
    if (doctor) query.doctor = doctor;
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.appointmentDate = {};
      if (dateFrom) query.appointmentDate.$gte = new Date(dateFrom);
      if (dateTo) query.appointmentDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(query)
      .populate('patient', 'name phone email language')
      .populate('doctor', 'name specialization')
      .populate('aiCallLog')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('aiCallLog')
      .populate('rescheduledFrom')
      .populate('rescheduledTo');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
  try {
    const { patient, doctor, appointmentDate, appointmentTime } = req.body;

    // Verify patient and doctor exist
    const patientDoc = await Patient.findById(patient);
    const doctorDoc = await Doctor.findById(doctor);

    if (!patientDoc || !doctorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Patient or Doctor not found'
      });
    }

    // Check if doctor is available
    const dayOfWeek = new Date(appointmentDate).getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayOfWeek];
    
    if (!doctorDoc.availability[dayName].isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available on this day'
      });
    }

    // Create appointment
    const appointment = await Appointment.create(req.body);
    
    await appointment.populate('patient doctor');

    logger.info('Appointment created', { appointmentId: appointment._id });
    logger.audit('APPOINTMENT_CREATED', req.user.email, { 
      appointmentId: appointment._id,
      patientName: patientDoc.name,
      doctorName: doctorDoc.name
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patient doctor');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    logger.info('Appointment updated', { appointmentId: appointment._id });
    logger.audit('APPOINTMENT_UPDATED', req.user.email, { 
      appointmentId: appointment._id
    });

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { cancelledBy, cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = cancelledBy || 'admin';
    appointment.cancellationReason = cancellationReason;
    await appointment.save();

    logger.info('Appointment cancelled', { appointmentId: appointment._id });
    logger.audit('APPOINTMENT_CANCELLED', req.user.email, { 
      appointmentId: appointment._id,
      reason: cancellationReason
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule appointment
// @route   POST /api/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;

    const oldAppointment = await Appointment.findById(req.params.id)
      .populate('patient doctor');

    if (!oldAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Mark old appointment as rescheduled
    oldAppointment.status = 'rescheduled';
    await oldAppointment.save();

    // Create new appointment
    const newAppointment = await Appointment.create({
      patient: oldAppointment.patient._id,
      doctor: oldAppointment.doctor._id,
      appointmentDate,
      appointmentTime,
      duration: oldAppointment.duration,
      type: oldAppointment.type,
      reason: oldAppointment.reason,
      symptoms: oldAppointment.symptoms,
      notes: oldAppointment.notes,
      status: 'scheduled',
      rescheduledFrom: oldAppointment._id
    });

    // Link old to new
    oldAppointment.rescheduledTo = newAppointment._id;
    await oldAppointment.save();

    await newAppointment.populate('patient doctor');

    logger.info('Appointment rescheduled', { 
      oldId: oldAppointment._id, 
      newId: newAppointment._id 
    });
    logger.audit('APPOINTMENT_RESCHEDULED', req.user.email, { 
      oldId: oldAppointment._id,
      newId: newAppointment._id
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: { appointment: newAppointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate AI call for appointment
// @route   POST /api/appointments/:id/call
// @access  Private
exports.initiateAppointmentCall = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Initiate Vapi call
    const vapiCall = await vapiService.makeAppointmentCall(
      appointment.patient,
      appointment
    );

    // Create call log
    const callLog = await CallLog.create({
      callId: vapiCall.id,
      patient: appointment.patient._id,
      appointment: appointment._id,
      callType: 'appointment-confirmation',
      status: 'initiated',
      language: appointment.patient.language,
      aiProvider: 'vapi',
      vapiData: {
        assistantId: vapiCall.assistantId,
        callData: vapiCall
      }
    });

    // Update appointment
    appointment.aiCallLog = callLog._id;
    appointment.callAttempts += 1;
    appointment.lastCallDate = new Date();
    await appointment.save();

    logger.info('AI call initiated', { 
      appointmentId: appointment._id,
      callId: vapiCall.id 
    });

    res.status(200).json({
      success: true,
      message: 'AI call initiated successfully',
      data: {
        callLog,
        vapiCall
      }
    });
  } catch (error) {
    logger.error('Error initiating call', error);
    next(error);
  }
};

// @desc    Get appointment statistics
// @route   GET /api/appointments/stats
// @access  Private
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const total = await Appointment.countDocuments();
    
    const byStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow }
    });

    const upcomingWeek = new Date();
    upcomingWeek.setDate(upcomingWeek.getDate() + 7);

    const weekAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lte: upcomingWeek }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        todayAppointments,
        weekAppointments
      }
    });
  } catch (error) {
    next(error);
  }
};
