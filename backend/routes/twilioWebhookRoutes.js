const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

/**
 * Voice webhook - Twilio calls this when call is answered
 * Generates TwiML for the call flow. Supports both GET and POST.
 */
router.all('/voice/:appointmentId?', async (req, res) => {
    try {
        const appointmentId = req.params.appointmentId || req.query.appointmentId;

        if (!appointmentId) {
            // Fallback for simple inbound calls without an ID
            const twiml = new (require('twilio').twiml.VoiceResponse)();
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Hello. This is CareCall AI. Please contact the clinic for appointment help. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('patient')
            .populate('doctor');

        if (!appointment) {
            const twiml = new require('twilio').twiml.VoiceResponse();
            twiml.say('Sorry, we could not find your appointment. Please contact the clinic. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const twiml = twilioService.generateAppointmentTwiML(
            appointment.patient,
            appointment
        );

        logger.info('TwiML generated for appointment', {
            appointmentId: appointment._id,
            callSid: req.body.CallSid
        });

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error('Error in voice webhook', error);
        const twiml = new require('twilio').twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Please contact the clinic. Goodbye.');
        twiml.hangup();
        res.type('text/xml').send(twiml.toString());
    }
});

/**
 * Gather webhook - Handles user DTMF input (1/2/3)
 */
router.post('/gather/:appointmentId', async (req, res) => {
    try {
        const { Digits, CallSid } = req.body;
        const appointment = await Appointment.findById(req.params.appointmentId);

        if (!appointment) {
            const twiml = new require('twilio').twiml.VoiceResponse();
            twiml.say('Sorry, appointment not found. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        // Handle user input
        const { twiml, action } = await twilioService.handleGatherResponse(
            req.params.appointmentId,
            Digits
        );

        // Update appointment status based on action
        switch (action) {
            case 'confirmed':
                appointment.status = 'confirmed';
                break;
            case 'cancelled':
                appointment.status = 'cancelled';
                appointment.cancelledBy = 'patient';
                appointment.cancellationReason = 'Cancelled via phone call';
                break;
            case 'reschedule_requested':
                appointment.notes = (appointment.notes || '') + '\nPatient requested reschedule via phone call.';
                break;
        }

        await appointment.save();

        // Update call log with outcome
        await CallLog.findOneAndUpdate(
            { callId: CallSid },
            {
                outcome: action === 'confirmed' ? 'appointment-confirmed' :
                    action === 'cancelled' ? 'appointment-cancelled' :
                        action === 'reschedule_requested' ? 'appointment-rescheduled' :
                            'no-action',
                intent: {
                    detected: action === 'confirmed' ? 'confirm' :
                        action === 'cancelled' ? 'cancel' :
                            action === 'reschedule_requested' ? 'reschedule' :
                                'unclear',
                    confidence: 1.0
                }
            }
        );

        logger.info('Gather response processed', {
            appointmentId: appointment._id,
            digits: Digits,
            action,
            callSid: CallSid
        });

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error('Error in gather webhook', error);
        const twiml = new require('twilio').twiml.VoiceResponse();
        twiml.say('Sorry, there was an error. Goodbye.');
        twiml.hangup();
        res.type('text/xml').send(twiml.toString());
    }
});

/**
 * Patient follow-up voice webhook (direct model)
 */
router.all('/voice/patient/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const Patient = require('../models/Patient');
        const patient = await Patient.findById(id);

        if (!patient) {
            const twiml = new (require('twilio').twiml.VoiceResponse)();
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, we could not find your details. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const twiml = twilioService.generatePatientTwiML(patient);
        res.type('text/xml').send(twiml);
    } catch (error) {
        logger.error('Error in patient voice webhook', error);
        res.status(500).send('Error');
    }
});

/**
 * Follow-up voice webhook
 */
router.all('/voice/followup/:followUpId', async (req, res) => {
    try {
        const { followUpId } = req.params;
        const followUp = await FollowUp.findById(followUpId)
            .populate('patient')
            .populate('doctor');

        if (!followUp) {
            const twiml = new (require('twilio').twiml.VoiceResponse)();
            twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Sorry, we could not find your follow-up details. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const twiml = twilioService.generateFollowUpTwiML(followUp.patient, followUp);
        res.type('text/xml').send(twiml);
    } catch (error) {
        logger.error('Error in follow-up voice webhook', error);
        res.status(500).send('Error');
    }
});

/**
 * Follow-up gather webhook
 */
router.post('/gather/followup/:followUpId', async (req, res) => {
    try {
        const { followUpId } = req.params;
        const { Digits } = req.body;

        const { twiml, action } = await twilioService.handleFollowUpGatherResponse(followUpId, Digits);

        if (action === 'completed' || action === 'nurse_requested') {
            await FollowUp.findByIdAndUpdate(followUpId, {
                status: 'completed',
                completedDate: new Date(),
                notes: action === 'nurse_requested' ? 'Patient requested nurse call.' : 'Completed via AI call.'
            });
        }

        res.type('text/xml').send(twiml);
    } catch (error) {
        logger.error('Error in follow-up gather webhook', error);
        res.status(500).send('Error');
    }
});

/**
 * Status callback - Tracks call status changes
 */
router.all('/status', async (req, res) => {
    try {
        const { CallSid, CallStatus, Duration, CallDuration } = req.body;

        const updateData = {
            status: CallStatus,
            duration: Duration || CallDuration || 0
        };

        if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
            updateData.endTime = new Date();
        }

        await CallLog.findOneAndUpdate(
            { callId: CallSid },
            updateData
        );

        logger.info('Call status updated', {
            callSid: CallSid,
            status: CallStatus,
            duration: Duration
        });

        res.sendStatus(200);
    } catch (error) {
        logger.error('Error in status callback', error);
        res.sendStatus(200); // Always return 200 to Twilio
    }
});

/**
 * Recording callback - Handles call recordings
 */
router.post('/recording', async (req, res) => {
    try {
        const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;

        await CallLog.findOneAndUpdate(
            { callId: CallSid },
            {
                recording: {
                    url: RecordingUrl,
                    sid: RecordingSid,
                    duration: RecordingDuration
                }
            }
        );

        logger.info('Recording saved', {
            callSid: CallSid,
            recordingSid: RecordingSid,
            duration: RecordingDuration
        });

        res.sendStatus(200);
    } catch (error) {
        logger.error('Error in recording callback', error);
        res.sendStatus(200);
    }
});

module.exports = router;
