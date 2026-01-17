const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  qualification: {
    type: String,
    trim: true
  },
  experience: {
    type: Number,
    min: 0
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    trim: true
  },
  availability: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    }
  }],
  consultationFee: {
    type: Number,
    min: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalPatients: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
doctorSchema.index({ specialization: 1 });
// email already has unique index from schema definition
doctorSchema.index({ status: 1 });

// Method to check if doctor is available on a specific day and time
doctorSchema.methods.isAvailableAt = function (dayOfWeek, time) {
  if (!Array.isArray(this.availability)) return false;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek];

  // Find slots for the given day
  const daySlots = this.availability.filter(slot => slot.dayOfWeek === dayName);

  if (daySlots.length === 0) return false;

  // Check if time falls within any slot
  return daySlots.some(slot => {
    return time >= slot.startTime && time <= slot.endTime;
  });
};

module.exports = mongoose.model('Doctor', doctorSchema);
