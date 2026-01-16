const CallLog = require('../models/CallLog');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const vapiService = require('../services/vapiService');
const logger = require('../utils/logger');

// @desc    Handle Vapi webhook events
// @route   POST /api/webhooks/vapi
// @access  Public (but signature verified)
exports.handleVapiWebhook = async (req, res, next) => {
  try {
    const event = req.body;
    
    logger.info('Vapi webhook received', { 
      type: event.type,
      callId: event.call?.id 
    });

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'call-started':
        await handleCallStarted(event);
        break;
      
      case 'call-ended':
      case 'call-completed':
        await handleCallEnded(event);
        break;
      
      case 'call-failed':
        await handleCallFailed(event);
        break;
      
      case 'transcript':
        await handleTranscript(event);
        break;
      
      case 'function-call':
        await handleFunctionCall(event);
        break;
      
      default:
        logger.warn('Unknown webhook event type', { type: event.type });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    logger.error('Webhook processing error', error);
    // Still return 200 to Vapi to avoid retries
    res.status(200).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
};

// Handle call started event
async function handleCallStarted(event) {
  try {
    const callLog = await CallLog.findOne({ callId: event.call.id });
    
    if (callLog) {
      callLog.status = event.call.status === 'ringing' ? 'ringing' : 'answered';
      callLog.startTime = new Date(event.call.startedAt);
      await callLog.save();
      
      logger.info('Call started', { callId: event.call.id });
    }
  } catch (error) {
    logger.error('Error handling call started', error);
  }
}

// Handle call ended event
async function handleCallEnded(event) {
  try {
    const callLog = await CallLog.findOne({ callId: event.call.id });
    
    if (!callLog) {
      logger.warn('Call log not found for ended call', { callId: event.call.id });
      return;
    }

    // Update call log
    callLog.status = 'completed';
    callLog.endTime = new Date(event.call.endedAt);
    callLog.duration = Math.floor((callLog.endTime - callLog.startTime) / 1000);
    
    // Extract transcript
    if (event.call.transcript) {
      callLog.transcript = event.call.transcript;
      
      // Extract intent
      const intent = vapiService.extractIntent(event.call.transcript);
      callLog.intent = {
        detected: intent,
        confidence: intent !== 'unclear' ? 0.8 : 0.3
      };
      
      // Analyze sentiment
      const sentiment = vapiService.analyzeSentiment(event.call.transcript);
      callLog.sentiment = sentiment.sentiment;
      callLog.sentimentScore = sentiment.score;
    }

    // Determine outcome based on intent
    if (callLog.intent.detected === 'confirm') {
      callLog.outcome = 'appointment-confirmed';
    } else if (callLog.intent.detected === 'reschedule') {
      callLog.outcome = 'appointment-rescheduled';
    } else if (callLog.intent.detected === 'cancel') {
      callLog.outcome = 'appointment-cancelled';
    } else if (callLog.callType === 'follow-up') {
      callLog.outcome = 'follow-up-completed';
    } else {
      callLog.outcome = 'no-action';
    }

    // Cost calculation (example rates)
    callLog.cost = (callLog.duration / 60) * 0.05; // $0.05 per minute

    await callLog.save();

    // Update related appointment or follow-up
    if (callLog.appointment) {
      await updateAppointmentFromCall(callLog);
    }

    if (callLog.followUp) {
      await updateFollowUpFromCall(callLog);
    }

    logger.info('Call ended and processed', { 
      callId: event.call.id,
      outcome: callLog.outcome,
      intent: callLog.intent.detected
    });
  } catch (error) {
    logger.error('Error handling call ended', error);
  }
}

// Handle call failed event
async function handleCallFailed(event) {
  try {
    const callLog = await CallLog.findOne({ callId: event.call.id });
    
    if (callLog) {
      callLog.status = 'failed';
      callLog.endTime = new Date();
      callLog.outcome = 'failed';
      callLog.notes = event.call.endReason || 'Call failed';
      await callLog.save();
      
      // Increment retry count
      callLog.retryCount += 1;
      await callLog.save();

      // Update appointment status
      if (callLog.appointment) {
        const appointment = await Appointment.findById(callLog.appointment);
        if (appointment && callLog.retryCount >= 3) {
          appointment.status = 'no-response';
          await appointment.save();
        }
      }

      // Update follow-up
      if (callLog.followUp) {
        const followUp = await FollowUp.findById(callLog.followUp);
        if (followUp) {
          if (followUp.attempt.current >= followUp.attempt.max) {
            followUp.status = 'failed';
          } else {
            // Schedule retry
            const nextAttempt = new Date();
            nextAttempt.setHours(nextAttempt.getHours() + 2);
            followUp.nextAttemptDate = nextAttempt;
          }
          await followUp.save();
        }
      }

      logger.warn('Call failed', { callId: event.call.id, reason: event.call.endReason });
    }
  } catch (error) {
    logger.error('Error handling call failed', error);
  }
}

// Handle transcript event
async function handleTranscript(event) {
  try {
    const callLog = await CallLog.findOne({ callId: event.call.id });
    
    if (callLog) {
      callLog.transcript = event.transcript;
      await callLog.save();
    }
  } catch (error) {
    logger.error('Error handling transcript', error);
  }
}

// Handle function call (for advanced use cases)
async function handleFunctionCall(event) {
  try {
    logger.info('Function call received', { 
      callId: event.call.id,
      function: event.functionCall.name 
    });
    
    // Handle custom function calls here if needed
    // For example: book_appointment, check_availability, etc.
  } catch (error) {
    logger.error('Error handling function call', error);
  }
}

// Update appointment based on call outcome
async function updateAppointmentFromCall(callLog) {
  try {
    const appointment = await Appointment.findById(callLog.appointment);
    
    if (!appointment) return;

    if (callLog.outcome === 'appointment-confirmed') {
      appointment.status = 'confirmed';
      appointment.confirmationMethod = 'ai-call';
    } else if (callLog.outcome === 'appointment-cancelled') {
      appointment.status = 'cancelled';
      appointment.cancelledBy = 'patient';
    }
    // For reschedule, handle manually as it needs new date/time

    await appointment.save();
  } catch (error) {
    logger.error('Error updating appointment from call', error);
  }
}

// Update follow-up based on call outcome
async function updateFollowUpFromCall(callLog) {
  try {
    const followUp = await FollowUp.findById(callLog.followUp);
    
    if (!followUp) return;

    if (callLog.outcome === 'follow-up-completed') {
      followUp.status = 'completed';
      followUp.completedDate = new Date();
      
      // Extract responses from transcript (basic)
      if (callLog.transcript) {
        followUp.notes = callLog.transcript;
        // In production, use NLP to extract structured responses
      }
    }

    await followUp.save();
  } catch (error) {
    logger.error('Error updating follow-up from call', error);
  }
}

module.exports = {
  handleVapiWebhook: exports.handleVapiWebhook
};
