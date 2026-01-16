const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  followUp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FollowUp'
  },
  callType: {
    type: String,
    enum: ['appointment-confirmation', 'appointment-reminder', 'follow-up', 'rescheduling', 'general'],
    required: true
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    default: 'outbound'
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer', 'voicemail'],
    default: 'initiated'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  transcript: {
    type: String
  },
  intent: {
    detected: {
      type: String,
      enum: ['confirm', 'reschedule', 'cancel', 'query', 'complaint', 'emergency', 'unclear']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'mixed'],
    default: 'neutral'
  },
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },
  outcome: {
    type: String,
    enum: ['appointment-confirmed', 'appointment-rescheduled', 'appointment-cancelled', 'follow-up-completed', 'callback-requested', 'no-action', 'failed']
  },
  language: {
    type: String,
    default: 'english'
  },
  aiProvider: {
    type: String,
    enum: ['vapi', 'twilio', 'custom'],
    default: 'vapi'
  },
  vapiData: {
    assistantId: String,
    callData: mongoose.Schema.Types.Mixed
  },
  recording: {
    url: String,
    duration: Number
  },
  cost: {
    type: Number,
    default: 0
  },
  retryCount: {
    type: Number,
    default: 0
  },
  notes: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
callLogSchema.index({ callId: 1 });
callLogSchema.index({ patient: 1 });
callLogSchema.index({ appointment: 1 });
callLogSchema.index({ status: 1 });
callLogSchema.index({ callType: 1 });
callLogSchema.index({ startTime: -1 });

// Virtual for call success
callLogSchema.virtual('isSuccessful').get(function() {
  return ['answered', 'completed'].includes(this.status) && 
         ['appointment-confirmed', 'follow-up-completed'].includes(this.outcome);
});

module.exports = mongoose.model('CallLog', callLogSchema);
