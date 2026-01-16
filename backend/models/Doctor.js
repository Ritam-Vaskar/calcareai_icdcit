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
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    tuesday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    wednesday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    thursday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    friday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{
        startTime: String,
        endTime: String
      }]
    }
  },
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
doctorSchema.index({ email: 1 });
doctorSchema.index({ status: 1 });

// Method to check if doctor is available on a specific day and time
doctorSchema.methods.isAvailableAt = function(dayOfWeek, time) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[dayOfWeek];
  
  if (!this.availability[day].isAvailable) {
    return false;
  }
  
  // Check if time falls within any slot
  return this.availability[day].slots.some(slot => {
    return time >= slot.startTime && time <= slot.endTime;
  });
};

module.exports = mongoose.model('Doctor', doctorSchema);
