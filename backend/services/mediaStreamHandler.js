const WebSocket = require('ws');
const aiConversationService = require('../services/aiConversationService');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

class MediaStreamHandler {
    constructor() {
        this.activeSessions = new Map();
    }

    /**
     * Handle WebSocket connection for Twilio Media Streams
     */
    handleConnection(ws) {
        logger.info('Media stream connection established');

        let sessionData = {
            streamSid: null,
            callSid: null,
            appointmentId: null,
            followUpId: null,
            patientId: null,
            audioBuffer: [],
            conversationContext: null
        };

        ws.on('message', async (message) => {
            try {
                const msg = JSON.parse(message);

                switch (msg.event) {
                    case 'start':
                        await this.handleStart(msg, sessionData, ws);
                        break;

                    case 'media':
                        await this.handleMedia(msg, sessionData, ws);
                        break;

                    case 'stop':
                        await this.handleStop(msg, sessionData);
                        break;

                    default:
                        logger.debug('Unknown event', { event: msg.event });
                }
            } catch (error) {
                logger.error('Error handling media stream message', error);
            }
        });

        ws.on('close', () => {
            logger.info('Media stream connection closed');
            if (sessionData.streamSid) {
                this.activeSessions.delete(sessionData.streamSid);
            }
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error', error);
        });
    }

    /**
     * Handle stream start
     */
    async handleStart(msg, sessionData, ws) {
        sessionData.streamSid = msg.streamSid;
        sessionData.callSid = msg.start.callSid;

        // Extract IDs from custom parameters
        const customParams = msg.start.customParameters;
        sessionData.appointmentId = customParams?.appointmentId;
        sessionData.followUpId = customParams?.followUpId;
        sessionData.patientId = customParams?.patientId;

        logger.info('Stream started', {
            streamSid: sessionData.streamSid,
            callSid: sessionData.callSid,
            appointmentId: sessionData.appointmentId,
            followUpId: sessionData.followUpId,
            patientId: sessionData.patientId
        });

        // Load context
        try {
            if (sessionData.patientId) {
                const patient = await Patient.findById(sessionData.patientId)
                    .populate('assignedDoctor');

                if (patient) {
                    sessionData.conversationContext = {
                        patient: patient,
                        doctor: patient.assignedDoctor || (patient.latestFollowUpDetails?.doctor ? await Doctor.findById(patient.latestFollowUpDetails.doctor) : null),
                        followUp: patient.latestFollowUpDetails
                    };
                }
            } else if (sessionData.followUpId) {
                const FollowUp = require('../models/FollowUp');
                const followUp = await FollowUp.findById(sessionData.followUpId)
                    .populate('patient')
                    .populate('doctor')
                    .populate('appointment');

                if (followUp) {
                    sessionData.conversationContext = {
                        patient: followUp.patient,
                        followUp: followUp,
                        doctor: followUp.doctor
                    };
                }
            } else if (sessionData.appointmentId) {
                const appointment = await Appointment.findById(sessionData.appointmentId)
                    .populate('patient')
                    .populate('doctor');

                if (appointment) {
                    sessionData.conversationContext = {
                        patient: appointment.patient,
                        appointment: appointment,
                        doctor: appointment.doctor
                    };
                }
            }
        } catch (err) {
            logger.error('Error loading context for media stream', err);
        }

        this.activeSessions.set(sessionData.streamSid, sessionData);

        logger.info('Stream context loaded and ready');
    }

    /**
     * Handle incoming audio media
     */
    async handleMedia(msg, sessionData, ws) {
        // Collect audio chunks
        const audioPayload = msg.media.payload;
        if (!sessionData.audioBuffer) sessionData.audioBuffer = [];
        sessionData.audioBuffer.push(Buffer.from(audioPayload, 'base64'));

        // Process every 6 seconds of audio to avoid rate limits
        if (sessionData.audioBuffer.length >= 48) { // ~6 seconds at 8kHz
            await this.processAudioBuffer(sessionData, ws);
            sessionData.audioBuffer = [];
        }
    }

    /**
     * Process collected audio buffer
     */
    async processAudioBuffer(sessionData, ws) {
        try {
            if (!aiConversationService.isConfigured()) {
                logger.warn('AI conversation service not configured');
                return;
            }

            if (!sessionData.conversationContext) {
                logger.warn('No conversation context available');
                return;
            }

            // Combine audio chunks
            const audioBuffer = Buffer.concat(sessionData.audioBuffer);

            // Process with AI
            const result = await aiConversationService.processAudio(
                audioBuffer,
                sessionData.conversationContext
            );

            // If no transcript was detected, don't respond
            if (!result.transcript || result.transcript.trim().length === 0) {
                logger.debug('No transcript detected, skipping response');
                return;
            }

            logger.info('AI processed audio', {
                transcript: result.transcript,
                response: result.aiResponse
            });

            // Update call log with transcript
            await CallLog.findOneAndUpdate(
                { callId: sessionData.callSid },
                {
                    $push: {
                        conversation: {
                            speaker: 'patient',
                            text: result.transcript,
                            timestamp: new Date()
                        }
                    }
                }
            );

            // Send AI response back to call
            await this.sendAudioResponse(ws, result.aiResponse, sessionData);

            // Detect intent and update record if needed
            const intent = aiConversationService.detectIntent(result.transcript);

            if (sessionData.appointmentId && intent.intent === 'confirm') {
                await Appointment.findByIdAndUpdate(sessionData.appointmentId, {
                    status: 'confirmed'
                });
            } else if (sessionData.patientId) {
                if (intent.intent === 'confirm' || result.transcript.toLowerCase().includes('better')) {
                    await Patient.findByIdAndUpdate(sessionData.patientId, {
                        status: 'active',
                        notes: (sessionData.conversationContext?.patient?.notes || '') + '\nFollow-up: Patient confirmed feeling better via AI call.'
                    });
                }
            } else if (sessionData.followUpId) {
                const FollowUp = require('../models/FollowUp');
                if (intent.intent === 'confirm' || result.transcript.toLowerCase().includes('better')) {
                    await FollowUp.findByIdAndUpdate(sessionData.followUpId, {
                        status: 'completed',
                        notes: 'Patient confirmed feeling better via AI call.'
                    });
                }
            }

        } catch (error) {
            logger.error('Error processing audio buffer', error);
        }
    }

    /**
     * Send audio response back to the call
     */
    async sendAudioResponse(ws, text, sessionData) {
        try {
            // Convert text to speech
            const audioBuffer = await aiConversationService.synthesizeSpeech(text);

            // Convert to base64 and send to Twilio
            const base64Audio = audioBuffer.toString('base64');

            ws.send(JSON.stringify({
                event: 'media',
                streamSid: sessionData.streamSid,
                media: {
                    payload: base64Audio
                }
            }));

            logger.info('AI response sent', { text });

            // Log AI response
            const CallLog = require('../models/CallLog');
            await CallLog.findOneAndUpdate(
                { callId: sessionData.callSid },
                {
                    $push: {
                        conversation: {
                            speaker: 'ai',
                            text: text,
                            timestamp: new Date()
                        }
                    }
                }
            );

        } catch (error) {
            logger.error('Error sending audio response', error);
        }
    }

    /**
     * Handle stream stop
     */
    async handleStop(msg, sessionData) {
        logger.info('Stream stopped', {
            streamSid: sessionData.streamSid,
            callSid: sessionData.callSid
        });

        // Update call log
        await CallLog.findOneAndUpdate(
            { callId: sessionData.callSid },
            {
                status: 'completed',
                endTime: new Date()
            }
        );

        this.activeSessions.delete(sessionData.streamSid);
    }
}

module.exports = new MediaStreamHandler();
