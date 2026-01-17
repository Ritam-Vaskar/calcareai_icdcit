const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  dateOfBirth: {
    type: Date
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },
  language: {
    type: String,
    enum: ['english', 'hindi', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati'],
    default: 'english'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  medicalHistory: {
    conditions: [String],
    allergies: [String],
    medications: [String],
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    }
  },
  prescriptions: [{
    date: {
      type: Date,
      default: Date.now
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    diagnosis: String,
    notes: String
  }],
  medicalRecords: [{
    date: {
      type: Date,
      default: Date.now
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    type: {
      type: String,
      enum: ['consultation', 'lab-report', 'imaging', 'surgery', 'follow-up', 'emergency']
    },
    diagnosis: String,
    symptoms: [String],
    vitals: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number
    },
    treatment: String,
    notes: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  }],
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  notes: String,
  tags: [String],
  lastVisit: Date,
  nextFollowUp: Date
}, {
  timestamps: true
});

// Indexes for better query performance
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ status: 1 });

// Virtual for full address
patientSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

module.exports = mongoose.model('Patient', patientSchema);
