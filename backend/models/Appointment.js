const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required']
  },
  duration: {
    type: Number,
    default: 30 // minutes
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup', 'surgery'],
    default: 'consultation'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no-show', 'no-response'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    trim: true
  },
  symptoms: [String],
  notes: String,
  callAttempts: {
    type: Number,
    default: 0
  },
  lastCallDate: Date,
  confirmationMethod: {
    type: String,
    enum: ['phone', 'ai-call', 'manual', 'sms', 'email'],
    default: 'ai-call'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderDate: Date,
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'admin', 'system']
  },
  cancellationReason: String,
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  aiCallLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for performance
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

// Compound index to prevent double booking
appointmentSchema.index({ doctor: 1, appointmentDate: 1, appointmentTime: 1 }, { unique: true });

// Check for conflicts before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.isNew && !this.isModified('appointmentDate') && !this.isModified('appointmentTime')) {
    return next();
  }
  
  // Check for existing appointment at same time
  const existingAppointment = await this.constructor.findOne({
    doctor: this.doctor,
    appointmentDate: this.appointmentDate,
    appointmentTime: this.appointmentTime,
    status: { $nin: ['cancelled', 'no-show'] },
    _id: { $ne: this._id }
  });
  
  if (existingAppointment) {
    throw new Error('Doctor already has an appointment at this time');
  }
  
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
