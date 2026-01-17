const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      logger.warn('Twilio credentials not configured. Twilio calling disabled.');
    }
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.phoneNumber);
  }

  /**
   * Initiate outbound call for appointment confirmation
   */
  async makeAppointmentCall(patient, appointment) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Twilio is not configured. Please add TWILIO credentials to .env');
      }

      const webhookUrl = process.env.TWILIO_WEBHOOK_URL || process.env.WEBHOOK_BASE_URL;

      const call = await this.client.calls.create({
        to: patient.phone,
        from: this.phoneNumber,
        url: `${webhookUrl}/api/webhooks/twilio/voice/${appointment._id}`,
        statusCallback: `${webhookUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingStatusCallback: `${webhookUrl}/api/webhooks/twilio/recording`,
        recordingStatusCallbackMethod: 'POST'
      });

      logger.info('Twilio call initiated', {
        callSid: call.sid,
        to: patient.phone,
        appointmentId: appointment._id,
        status: call.status
      });

      return {
        id: call.sid,
        status: call.status,
        to: call.to,
        from: call.from,
        provider: 'twilio'
      };
    } catch (error) {
      logger.error('Twilio call error', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo
      });
      throw new Error(`Failed to initiate Twilio call: ${error.message}`);
    }
  }

  /**
   * Generate TwiML for appointment confirmation call
   */
  generateAppointmentTwiML(patient, appointment) {
    try {
      const twiml = new twilio.twiml.VoiceResponse();

      // Safe patient name extraction
      const patientName = patient?.name || 'there';

      // Greeting with error handling
      twiml.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, `Hello ${patientName}. This is CareCall AI calling from the clinic.`);

      twiml.pause({ length: 1 });

      // Safe appointment details extraction
      let appointmentMessage = 'You have an upcoming appointment.';

      try {
        if (appointment?.appointmentDate && appointment?.appointmentTime) {
          const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const doctorName = appointment.doctor?.name || 'your doctor';
          appointmentMessage = `You have an appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointment.appointmentTime}.`;
        }
      } catch (dateError) {
        logger.error('Error formatting appointment date', dateError);
        // Fallback message already set
      }

      twiml.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, appointmentMessage);

      twiml.pause({ length: 1 });

      // Gather response with proper error handling
      const webhookBase = process.env.TWILIO_WEBHOOK_URL || process.env.WEBHOOK_BASE_URL || 'http://localhost:5000';
      const appointmentId = appointment?._id || 'unknown';

      const gather = twiml.gather({
        input: 'dtmf',
        numDigits: 1,
        timeout: 10,
        action: `${webhookBase}/api/webhooks/twilio/gather/${appointmentId}`,
        method: 'POST'
      });

      gather.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, 'Press 1 to confirm your appointment. Press 2 if you need to reschedule. Press 3 to cancel.');

      // Fallback if no input
      twiml.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, 'We did not receive your response. We will call you again later. Thank you and goodbye.');

      twiml.hangup();

      return twiml.toString();

    } catch (error) {
      logger.error('Error generating TwiML', error);

      // Emergency fallback TwiML
      const fallbackTwiml = new twilio.twiml.VoiceResponse();
      fallbackTwiml.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, 'Hello. This is CareCall AI. We are experiencing technical difficulties. Please call us directly. Thank you.');
      fallbackTwiml.hangup();

      return fallbackTwiml.toString();
    }
  }

  /**
   * Initiate outbound call for patient follow-up (using Patient model directly)
   */
  async makePatientCall(patient) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Twilio is not configured. Please add TWILIO credentials to .env');
      }

      const webhookUrl = process.env.TWILIO_WEBHOOK_URL || process.env.WEBHOOK_BASE_URL;

      const call = await this.client.calls.create({
        to: patient.phone,
        from: this.phoneNumber,
        url: `${webhookUrl}/api/webhooks/twilio/voice/patient/${patient._id}`,
        statusCallback: `${webhookUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingStatusCallback: `${webhookUrl}/api/webhooks/twilio/recording`,
        recordingStatusCallbackMethod: 'POST'
      });

      logger.info('Twilio patient call initiated', {
        callSid: call.sid,
        to: patient.phone,
        patientId: patient._id
      });

      return {
        id: call.sid,
        status: call.status,
        to: call.to,
        from: call.from,
        provider: 'twilio'
      };
    } catch (error) {
      logger.error('Error initiating Twilio patient call', error);
      throw error;
    }
  }

  /**
   * Generate TwiML for patient follow-up call using Media Streams
   */
  generatePatientTwiML(patient) {
    try {
      const twiml = new twilio.twiml.VoiceResponse();

      const patientName = patient?.name || 'there';
      twiml.say({
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }, `Hello ${patientName}. This is CareCall AI calling from your clinic for a follow-up check. How are you feeling today?`);

      const connect = twiml.connect();
      const webhookBase = (process.env.WEBHOOK_BASE_URL || process.env.TWILIO_WEBHOOK_URL || '').replace('https://', '');

      const stream = connect.stream({
        url: `wss://${webhookBase}/media-stream`
      });

      stream.parameter({
        name: 'patientId',
        value: patient._id.toString()
      });

      return twiml.toString();
    } catch (error) {
      logger.error('Error generating Patient TwiML', error);
      const fallbackTwiml = new twilio.twiml.VoiceResponse();
      fallbackTwiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Hello. This is CareCall AI. We will call back shortly. Thank you.');
      fallbackTwiml.hangup();
      return fallbackTwiml.toString();
    }
  }

  async handleGatherResponse(appointmentId, digits) {
    const twiml = new twilio.twiml.VoiceResponse();

    switch (digits) {
      case '1': // Confirm
        twiml.say({
          voice: 'Polly.Aditi',
          language: 'en-IN'
        }, 'Thank you! Your appointment is confirmed. We look forward to seeing you.');
        return { twiml: twiml.toString(), action: 'confirmed' };

      case '2': // Reschedule
        twiml.say({
          voice: 'Polly.Aditi',
          language: 'en-IN'
        }, 'We understand you need to reschedule. Our staff will call you shortly to arrange a new time. Thank you.');
        return { twiml: twiml.toString(), action: 'reschedule_requested' };

      case '3': // Cancel
        twiml.say({
          voice: 'Polly.Aditi',
          language: 'en-IN'
        }, 'Your appointment has been cancelled. If you need to book again, please contact us. Thank you.');
        return { twiml: twiml.toString(), action: 'cancelled' };

      default:
        twiml.say({
          voice: 'Polly.Aditi',
          language: 'en-IN'
        }, 'Sorry, I did not understand your response. Please call us directly. Goodbye.');
        return { twiml: twiml.toString(), action: 'unclear' };
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Twilio is not configured');
      }

      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        from: call.from,
        to: call.to,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      logger.error('Error fetching call details', error);
      throw error;
    }
  }
}

module.exports = new TwilioService();
