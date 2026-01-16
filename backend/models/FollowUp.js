const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
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
    enum: ['post-visit', 'chronic-care', 'post-surgery', 'medication-reminder', 'test-results', 'general'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'failed', 'cancelled', 'skipped'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  purpose: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    answer: String,
    answerType: {
      type: String,
      enum: ['yes-no', 'scale', 'text', 'multiple-choice']
    }
  }],
  responses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  callLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  attempt: {
    current: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 3
    }
  },
  nextAttemptDate: Date,
  completedDate: Date,
  notes: String,
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionItems: [String],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: Number,
    endDate: Date
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
followUpSchema.index({ patient: 1 });
followUpSchema.index({ scheduledDate: 1 });
followUpSchema.index({ status: 1 });
followUpSchema.index({ priority: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
