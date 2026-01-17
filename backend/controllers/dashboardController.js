const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

/**
 * Get dashboard data based on user role
 */
exports.getDashboardData = async (req, res) => {
  try {
    const { role, relatedId } = req.user;
    let dashboardData = {};

    switch (role) {
      case 'admin':
        dashboardData = await getAdminDashboard();
        break;
      case 'doctor':
        dashboardData = await getDoctorDashboard(relatedId);
        break;
      case 'patient':
        dashboardData = await getPatientDashboard(relatedId);
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    res.status(200).json({
      success: true,
      role,
      data: dashboardData
    });
  } catch (error) {
    logger.error(`Error fetching dashboard data: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

/**
 * Admin Dashboard - Overview of entire system
 */
async function getAdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get counts
  const totalPatients = await Patient.countDocuments({ status: 'active' });
  const totalDoctors = await Doctor.countDocuments({ status: 'active' });
  const totalAppointments = await Appointment.countDocuments();
  const totalConversations = await Conversation.countDocuments();

  // Today's appointments
  const todaysAppointments = await Appointment.countDocuments({
    appointmentDate: { $gte: today, $lt: tomorrow }
  });

  // Pending conversations
  const pendingConversations = await Conversation.countDocuments({
    processed: false
  });

  // Urgent appointments
  const urgentAppointments = await Appointment.countDocuments({
    type: { $in: ['emergency', 'urgent'] },
    status: { $nin: ['completed', 'cancelled'] }
  });

  // Recent conversations with analysis
  const recentConversations = await Conversation.find()
    .populate('patient', 'name phone age gender')
    .populate('assignedDoctor', 'name specialization')
    .sort({ conversationDate: -1 })
    .limit(10);

  // Urgency breakdown
  const urgencyBreakdown = await Conversation.aggregate([
    {
      $group: {
        _id: '$analysis.urgencyLevel',
        count: { $sum: 1 }
      }
    }
  ]);

  // Specialization demand
  const specializationDemand = await Conversation.aggregate([
    {
      $group: {
        _id: '$analysis.suggestedSpecialization',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Upcoming appointments
  const upcomingAppointments = await Appointment.find({
    appointmentDate: { $gte: today },
    status: { $nin: ['completed', 'cancelled'] }
  })
    .populate('patient', 'name phone')
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(10);

  // Processing status
  const processingStats = await Conversation.aggregate([
    {
      $group: {
        _id: '$processingStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    overview: {
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalConversations,
      todaysAppointments,
      pendingConversations,
      urgentAppointments
    },
    recentConversations,
    upcomingAppointments,
    analytics: {
      urgencyBreakdown,
      specializationDemand,
      processingStats
    }
  };
}

/**
 * Doctor Dashboard - Assigned patients and appointments
 */
async function getDoctorDashboard(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get doctor details
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Assigned patients
  const assignedPatients = await Patient.find({
    assignedDoctor: doctorId,
    status: 'active'
  }).select('name phone email age gender medicalHistory lastVisit');

  // Today's appointments
  const todaysAppointments = await Appointment.find({
    doctor: doctorId,
    appointmentDate: { $gte: today, $lt: tomorrow },
    status: { $nin: ['cancelled'] }
  })
    .populate('patient', 'name phone age gender medicalHistory')
    .sort({ appointmentTime: 1 });

  // Upcoming appointments (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const upcomingAppointments = await Appointment.find({
    doctor: doctorId,
    appointmentDate: { $gte: tomorrow, $lt: nextWeek },
    status: { $nin: ['cancelled', 'completed'] }
  })
    .populate('patient', 'name phone age gender')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(10);

  // Recent patients with full medical history
  const recentPatients = await Appointment.find({
    doctor: doctorId,
    status: 'completed'
  })
    .populate({
      path: 'patient',
      select: 'name phone age gender medicalHistory prescriptions medicalRecords'
    })
    .sort({ appointmentDate: -1 })
    .limit(5);

  // Get unique patients from recent appointments
  const uniqueRecentPatients = [];
  const seenPatientIds = new Set();
  
  for (const appt of recentPatients) {
    if (appt.patient && !seenPatientIds.has(appt.patient._id.toString())) {
      uniqueRecentPatients.push(appt.patient);
      seenPatientIds.add(appt.patient._id.toString());
    }
  }

  // Pending appointments (scheduled but not confirmed)
  const pendingAppointments = await Appointment.find({
    doctor: doctorId,
    status: 'scheduled',
    appointmentDate: { $gte: today }
  })
    .populate('patient', 'name phone')
    .sort({ appointmentDate: 1 })
    .limit(5);

  // Statistics
  const totalAppointments = await Appointment.countDocuments({ doctor: doctorId });
  const completedAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    status: 'completed'
  });
  const cancelledAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    status: 'cancelled'
  });

  return {
    doctor: {
      name: doctor.name,
      specialization: doctor.specialization,
      experience: doctor.experience,
      rating: doctor.rating
    },
    overview: {
      totalPatients: assignedPatients.length,
      todaysAppointments: todaysAppointments.length,
      upcomingAppointments: upcomingAppointments.length,
      pendingConfirmations: pendingAppointments.length,
      totalAppointments,
      completedAppointments,
      cancelledAppointments
    },
    todaysSchedule: todaysAppointments,
    upcomingAppointments,
    assignedPatients: assignedPatients.slice(0, 10),
    recentPatients: uniqueRecentPatients,
    pendingAppointments
  };
}

/**
 * Patient Dashboard - Personal health information and appointments
 */
async function getPatientDashboard(patientId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get patient details with full medical history
  const patient = await Patient.findById(patientId)
    .populate('assignedDoctor', 'name specialization phone email');

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Upcoming appointments
  const upcomingAppointments = await Appointment.find({
    patient: patientId,
    appointmentDate: { $gte: today },
    status: { $nin: ['cancelled', 'completed'] }
  })
    .populate('doctor', 'name specialization phone email consultationFee')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

  // Past appointments
  const pastAppointments = await Appointment.find({
    patient: patientId,
    $or: [
      { status: 'completed' },
      { appointmentDate: { $lt: today } }
    ]
  })
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: -1 })
    .limit(10);

  // Recent conversations
  const recentConversations = await Conversation.find({
    patient: patientId
  })
    .populate('assignedDoctor', 'name specialization')
    .populate('scheduledAppointment')
    .sort({ conversationDate: -1 })
    .limit(5);

  // Next appointment
  const nextAppointment = upcomingAppointments.length > 0 
    ? upcomingAppointments[0] 
    : null;

  // Statistics
  const totalAppointments = await Appointment.countDocuments({ patient: patientId });
  const completedAppointments = await Appointment.countDocuments({
    patient: patientId,
    status: 'completed'
  });
  const cancelledAppointments = await Appointment.countDocuments({
    patient: patientId,
    status: 'cancelled'
  });

  return {
    patient: {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      bloodGroup: patient.medicalHistory?.bloodGroup,
      assignedDoctor: patient.assignedDoctor
    },
    overview: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      upcomingAppointments: upcomingAppointments.length,
      lastVisit: patient.lastVisit
    },
    nextAppointment,
    upcomingAppointments,
    pastAppointments,
    medicalHistory: {
      conditions: patient.medicalHistory?.conditions || [],
      allergies: patient.medicalHistory?.allergies || [],
      medications: patient.medicalHistory?.medications || [],
      bloodGroup: patient.medicalHistory?.bloodGroup
    },
    prescriptions: patient.prescriptions || [],
    medicalRecords: patient.medicalRecords || [],
    recentConversations
  };
}
