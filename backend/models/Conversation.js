const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  callLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  transcript: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  // AI Analysis Results
  analysis: {
    symptoms: [String],
    chiefComplaint: String,
    painLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    urgencyLevel: {
      type: String,
      enum: ['emergency', 'urgent', 'routine', 'follow-up'],
      required: true
    },
    suggestedSpecialization: {
      type: String,
      required: true
    },
    additionalNotes: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'distressed']
    },
    keyInsights: [String]
  },
  // MCP Agent Processing
  processed: {
    type: Boolean,
    default: false
  },
  processedAt: Date,
  processingStatus: {
    type: String,
    enum: ['pending', 'analyzing', 'scheduling', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String,
  // Appointment Scheduling Result
  scheduledAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  schedulingReason: String,
  // Metadata
  conversationDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['ai-call', 'manual', 'chatbot', 'vapi'],
    default: 'ai-call'
  },
  language: {
    type: String,
    default: 'english'
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ patient: 1, conversationDate: -1 });
conversationSchema.index({ processed: 1, processingStatus: 1 });
conversationSchema.index({ 'analysis.urgencyLevel': 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
