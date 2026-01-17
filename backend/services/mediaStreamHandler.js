const WebSocket = require('ws');
const aiConversationService = require('../services/aiConversationService');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

// Call states for proper conversation flow
const CallState = {
    LISTENING: 'LISTENING',
    THINKING: 'THINKING',
    SPEAKING: 'SPEAKING'
};

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
            conversationContext: null,
            callState: CallState.LISTENING,
            llmInProgress: false,
            lastTranscriptTime: null,
            silenceTimeout: null
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

        // Extract custom parameters
        const customParams = msg.start.customParameters || {};
        sessionData.appointmentId = customParams.appointmentId;
        sessionData.followUpId = customParams.followUpId;
        sessionData.patientId = customParams.patientId;

        logger.info('Stream started', {
            streamSid: sessionData.streamSid,
            callSid: sessionData.callSid,
            patientId: sessionData.patientId
        });

        // Load conversation context
        try {
            if (sessionData.patientId) {
                const patient = await Patient.findById(sessionData.patientId)
                    .populate('assignedDoctor');

                if (patient) {
                    sessionData.conversationContext = {
                        patient: patient,
                        followUp: patient.latestFollowUpDetails,
                        doctor: patient.assignedDoctor || patient.latestFollowUpDetails?.doctor
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
        logger.info('Stream context loaded, state: LISTENING');
    }

    /**
     * Handle incoming media (audio from caller)
     */
    async handleMedia(msg, sessionData, ws) {
        // CRITICAL: Drop audio if AI is thinking or speaking
        if (sessionData.callState !== CallState.LISTENING) {
            logger.debug('Dropping audio - AI is busy', { state: sessionData.callState });
            return;
        }

        // CRITICAL: Prevent duplicate LLM calls
        if (sessionData.llmInProgress) {
            logger.debug('Dropping audio - LLM already processing');
            return;
        }

        const audioPayload = msg.media.payload;

        // Buffer audio chunks
        if (!sessionData.audioBuffer) sessionData.audioBuffer = [];
        sessionData.audioBuffer.push(Buffer.from(audioPayload, 'base64'));

        // Process every 6 seconds of audio (48 chunks at 8kHz)
        // This gives user time to speak complete sentences
        if (sessionData.audioBuffer.length >= 48) {
            await this.processAudioBuffer(sessionData, ws);
            sessionData.audioBuffer = [];
        }
    }

    /**
     * Process collected audio buffer - ONE SHOT ONLY
     */
    async processAudioBuffer(sessionData, ws) {
        // GUARD: Prevent duplicate processing
        if (sessionData.llmInProgress) {
            logger.warn('LLM already in progress, skipping');
            return;
        }

        if (!aiConversationService.isConfigured()) {
            logger.warn('AI conversation service not configured');
            return;
        }

        try {
            // Set state to THINKING immediately
            sessionData.callState = CallState.THINKING;
            sessionData.llmInProgress = true;

            logger.info('Processing audio - State: THINKING');

            // Concatenate audio buffers
            const audioData = Buffer.concat(sessionData.audioBuffer);

            // Process audio through AI service (STT + LLM + TTS)
            const result = await aiConversationService.processAudio(
                audioData,
                sessionData.conversationContext
            );

            // Skip if no transcript detected
            if (!result.transcript || result.transcript.trim() === '') {
                logger.debug('No transcript detected, resuming listening');
                sessionData.callState = CallState.LISTENING;
                sessionData.llmInProgress = false;
                return;
            }

            logger.info('Transcript received', {
                transcript: result.transcript,
                response: result.aiResponse
            });

            // Set state to SPEAKING
            sessionData.callState = CallState.SPEAKING;

            // Send audio response to Twilio
            await this.sendAudioResponse(ws, result.aiResponse, result.audioBuffer, sessionData);

            // Log conversation
            await CallLog.findOneAndUpdate(
                { callId: sessionData.callSid },
                {
                    $push: {
                        conversation: [
                            {
                                speaker: 'patient',
                                text: result.transcript,
                                timestamp: new Date()
                            },
                            {
                                speaker: 'ai',
                                text: result.aiResponse,
                                timestamp: new Date()
                            }
                        ]
                    }
                }
            );

            // Update follow-up status if applicable
            if (sessionData.patientId) {
                const intent = aiConversationService.detectIntent(result.transcript);
                if (intent.intent === 'confirm' || result.transcript.toLowerCase().includes('better')) {
                    await Patient.findByIdAndUpdate(sessionData.patientId, {
                        status: 'active',
                        $push: {
                            notes: `Follow-up: Patient confirmed feeling better via AI call on ${new Date().toLocaleDateString()}`
                        }
                    });
                }
            }

        } catch (error) {
            logger.error('Error processing audio buffer', error);
            sessionData.callState = CallState.LISTENING;
            sessionData.llmInProgress = false;
        }
    }

    /**
     * Send audio response back to the call
     */
    async sendAudioResponse(ws, text, audioBuffer, sessionData) {
        try {
            logger.info('Sending AI audio response', {
                textLength: text.length,
                bufferSize: audioBuffer.length
            });

            // Convert to base64 mulaw
            const base64Audio = audioBuffer.toString('base64');

            // Send via WebSocket media event
            ws.send(JSON.stringify({
                event: 'media',
                streamSid: sessionData.streamSid,
                media: {
                    payload: base64Audio
                }
            }));

            logger.info('Audio sent to Twilio', { base64Length: base64Audio.length });

            // Calculate playback duration (mulaw 8kHz = 1 byte per sample)
            const durationMs = (audioBuffer.length / 8000) * 1000;

            // Wait for TTS to finish playing before resuming listening
            setTimeout(() => {
                sessionData.callState = CallState.LISTENING;
                sessionData.llmInProgress = false;
                logger.info('AI finished speaking - State: LISTENING');
            }, durationMs + 500); // Add 500ms buffer

        } catch (error) {
            logger.error('Error sending audio response', error);
            sessionData.callState = CallState.LISTENING;
            sessionData.llmInProgress = false;
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

        // Compile transcript from conversation
        try {
            const callLog = await CallLog.findOne({ callId: sessionData.callSid });
            
            if (callLog && callLog.conversation && callLog.conversation.length > 0) {
                // Compile full transcript from conversation array
                const transcript = callLog.conversation
                    .map(c => `${c.speaker.toUpperCase()}: ${c.text}`)
                    .join('\n');
                
                // Determine outcome based on conversation
                let outcome = callLog.outcome || 'no-action';
                let sentimentData = { sentiment: 'neutral', sentimentScore: 0 };
                
                // Simple sentiment analysis
                const fullText = callLog.conversation.map(c => c.text.toLowerCase()).join(' ');
                if (fullText.includes('confirm') || fullText.includes('yes') || fullText.includes('good') || fullText.includes('better')) {
                    sentimentData = { sentiment: 'positive', sentimentScore: 0.7 };
                    if (sessionData.appointmentId && fullText.includes('confirm')) {
                        outcome = 'appointment-confirmed';
                    } else if (sessionData.followUpId || sessionData.patientId) {
                        outcome = 'follow-up-completed';
                    }
                } else if (fullText.includes('cancel') || fullText.includes('no')) {
                    sentimentData = { sentiment: 'negative', sentimentScore: -0.5 };
                    if (fullText.includes('cancel')) {
                        outcome = 'appointment-cancelled';
                    }
                }
                
                // Update call log with compiled data
                await CallLog.findOneAndUpdate(
                    { callId: sessionData.callSid },
                    {
                        status: 'completed',
                        endTime: new Date(),
                        transcript: transcript,
                        outcome: outcome,
                        sentiment: sentimentData.sentiment,
                        sentimentScore: sentimentData.sentimentScore
                    }
                );
                
                logger.info('Call log updated with transcript and outcome', {
                    callSid: sessionData.callSid,
                    transcriptLength: transcript.length,
                    outcome
                });
            } else {
                // No conversation, just update status
                await CallLog.findOneAndUpdate(
                    { callId: sessionData.callSid },
                    {
                        status: 'completed',
                        endTime: new Date()
                    }
                );
            }
        } catch (error) {
            logger.error('Error updating call log on stop', error);
        }

        this.activeSessions.delete(sessionData.streamSid);
    }
}

module.exports = new MediaStreamHandler();
