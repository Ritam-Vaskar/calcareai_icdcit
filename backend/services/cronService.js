const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = [];
  }

  // Initialize all cron jobs
  init() {
    this.scheduleFollowUpCalls();
    this.scheduleAppointmentReminders();
    this.scheduleRetries();

    logger.info('Cron jobs initialized and enabled');
  }

  // Schedule follow-up calls (Patient-centric)
  scheduleFollowUpCalls() {
    // Run every hour
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running patient follow-up call scheduler');

        const now = new Date();
        // Find patients who finished a visit and are due for a follow-up call
        const duePatients = await Patient.find({
          status: 'completed',
          nextFollowUp: { $lte: now }
        });

        logger.info(`Found ${duePatients.length} patients due for follow-up`);

        for (const patient of duePatients) {
          try {
            // Import twilioService
            const twilioService = require('./twilioService');

            // Initiate call
            const twilioCall = await twilioService.makePatientCall(patient);

            // Create call log
            await CallLog.create({
              callId: twilioCall.id,
              patient: patient._id,
              callType: 'follow-up',
              status: 'initiated',
              language: patient.language || 'en-IN',
              aiProvider: 'twilio'
            });

            logger.info('Follow-up call initiated (Patient-centric)', {
              patientId: patient._id,
              callId: twilioCall.id
            });

            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            logger.error('Error initiating patient follow-up call', {
              patientId: patient._id,
              error: error.message
            });
          }
        }
      } catch (error) {
        logger.error('Error in follow-up scheduler', error);
      }
    });

    this.jobs.push(job);
  }

  // Schedule appointment reminders
  scheduleAppointmentReminders() {
    // Run daily at 9:00 AM
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Running appointment reminder scheduler');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        // Find appointments for tomorrow that need reminders
        const appointments = await Appointment.find({
          appointmentDate: { $gte: tomorrow, $lt: dayAfter },
          status: { $in: ['scheduled', 'confirmed'] },
          reminderSent: false
        }).populate('patient doctor');

        logger.info(`Found ${appointments.length} appointments needing reminders`);

        for (const appointment of appointments) {
          try {
            // Import twilioService
            const twilioService = require('./twilioService');

            // Initiate reminder call
            const twilioCall = await twilioService.makeAppointmentCall(
              appointment.patient,
              appointment
            );

            // Create call log
            const callLog = await CallLog.create({
              callId: twilioCall.id,
              patient: appointment.patient._id,
              appointment: appointment._id,
              callType: 'appointment-reminder',
              status: 'initiated',
              language: appointment.patient.language || 'en-IN',
              aiProvider: 'twilio'
            });

            // Update appointment
            appointment.aiCallLog = callLog._id;
            appointment.reminderSent = true;
            appointment.reminderDate = new Date();
            appointment.callAttempts += 1;
            await appointment.save();

            logger.info('Appointment reminder sent via Twilio', {
              appointmentId: appointment._id,
              callId: twilioCall.id
            });

            // Add delay
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            logger.error('Error sending reminder', {
              appointmentId: appointment._id,
              error: error.message
            });
          }
        }
      } catch (error) {
        logger.error('Error in reminder scheduler', error);
      }
    });

    this.jobs.push(job);
  }

  // Retry failed calls
  scheduleRetries() {
    // Run every 2 hours
    const job = cron.schedule('0 */2 * * *', async () => {
      try {
        logger.info('Running retry scheduler');

        const failedCalls = await CallLog.find({
          status: { $in: ['failed', 'no-answer', 'busy'] },
          retryCount: { $lt: 3 },
          startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).populate('patient appointment');

        logger.info(`Found ${failedCalls.length} calls to retry`);

        for (const call of failedCalls) {
          try {
            // Import twilioService
            const twilioService = require('./twilioService');
            let twilioCall;

            if (call.appointment) {
              twilioCall = await twilioService.makeAppointmentCall(
                call.patient,
                call.appointment
              );
            } else if (call.callType === 'follow-up' || call.followUp) {
              // Priority given to patient-centric retries
              twilioCall = await twilioService.makePatientCall(call.patient);
            } else {
              continue;
            }

            // Create new call log for retry
            await CallLog.create({
              callId: twilioCall.id,
              patient: call.patient._id,
              appointment: call.appointment?._id,
              callType: call.callType,
              status: 'initiated',
              language: call.language || 'en-IN',
              aiProvider: 'twilio',
              retryCount: (call.retryCount || 0) + 1
            });

            logger.info('Call retry initiated via Twilio', {
              originalCallId: call.callId,
              newCallId: twilioCall.id,
              retryCount: (call.retryCount || 0) + 1
            });

            // Add delay
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            logger.error('Error retrying call', {
              callId: call.callId,
              error: error.message
            });
          }
        }
      } catch (error) {
        logger.error('Error in retry scheduler', error);
      }
    });

    this.jobs.push(job);
  }

  // Stop all cron jobs
  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('All cron jobs stopped');
  }
}

module.exports = new CronService();
