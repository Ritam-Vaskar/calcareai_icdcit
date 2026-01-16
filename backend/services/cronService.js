const cron = require('node-cron');
const FollowUp = require('../models/FollowUp');
const Appointment = require('../models/Appointment');
const vapiService = require('./vapiService');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = [];
  }

  // Initialize all cron jobs
  init() {
    // Check for due follow-ups every hour
    this.scheduleFollowUpCalls();

    // Send appointment reminders daily at 9 AM
    this.scheduleAppointmentReminders();

    // Retry failed calls every 2 hours
    this.scheduleRetries();

    logger.info('Cron jobs initialized');
  }

  // Schedule follow-up calls
  scheduleFollowUpCalls() {
    // Run every hour
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running follow-up call scheduler');

        const now = new Date();
        const dueFollowUps = await FollowUp.find({
          status: 'scheduled',
          scheduledDate: { $lte: now },
          $expr: { $lt: ['$attempt.current', '$attempt.max'] }
        }).populate('patient');

        logger.info(`Found ${dueFollowUps.length} due follow-ups`);

        for (const followUp of dueFollowUps) {
          try {
            // Initiate call
            const vapiCall = await vapiService.makeFollowUpCall(
              followUp.patient,
              followUp
            );

            // Create call log
            const callLog = await CallLog.create({
              callId: vapiCall.id,
              patient: followUp.patient._id,
              followUp: followUp._id,
              callType: 'follow-up',
              status: 'initiated',
              language: followUp.patient.language,
              aiProvider: 'vapi',
              vapiData: {
                assistantId: vapiCall.assistantId,
                callData: vapiCall
              }
            });

            // Update follow-up
            followUp.callLog = callLog._id;
            followUp.status = 'in-progress';
            followUp.attempt.current += 1;
            await followUp.save();

            logger.info('Follow-up call initiated', { 
              followUpId: followUp._id,
              callId: vapiCall.id 
            });

            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            logger.error('Error initiating follow-up call', { 
              followUpId: followUp._id,
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
            // Initiate reminder call
            const vapiCall = await vapiService.makeAppointmentCall(
              appointment.patient,
              appointment
            );

            // Create call log
            const callLog = await CallLog.create({
              callId: vapiCall.id,
              patient: appointment.patient._id,
              appointment: appointment._id,
              callType: 'appointment-reminder',
              status: 'initiated',
              language: appointment.patient.language,
              aiProvider: 'vapi',
              vapiData: {
                assistantId: vapiCall.assistantId,
                callData: vapiCall
              }
            });

            // Update appointment
            appointment.aiCallLog = callLog._id;
            appointment.reminderSent = true;
            appointment.reminderDate = new Date();
            appointment.callAttempts += 1;
            await appointment.save();

            logger.info('Appointment reminder sent', { 
              appointmentId: appointment._id,
              callId: vapiCall.id 
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
        }).populate('patient appointment followUp');

        logger.info(`Found ${failedCalls.length} calls to retry`);

        for (const call of failedCalls) {
          try {
            let vapiCall;
            
            if (call.appointment) {
              vapiCall = await vapiService.makeAppointmentCall(
                call.patient,
                call.appointment
              );
            } else if (call.followUp) {
              vapiCall = await vapiService.makeFollowUpCall(
                call.patient,
                call.followUp
              );
            } else {
              continue;
            }

            // Create new call log for retry
            const newCallLog = await CallLog.create({
              callId: vapiCall.id,
              patient: call.patient._id,
              appointment: call.appointment?._id,
              followUp: call.followUp?._id,
              callType: call.callType,
              status: 'initiated',
              language: call.language,
              aiProvider: 'vapi',
              retryCount: call.retryCount + 1,
              vapiData: {
                assistantId: vapiCall.assistantId,
                callData: vapiCall
              }
            });

            logger.info('Call retry initiated', { 
              originalCallId: call.callId,
              newCallId: vapiCall.id,
              retryCount: call.retryCount + 1
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
