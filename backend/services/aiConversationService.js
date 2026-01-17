const { createClient } = require('@deepgram/sdk');
const ModelClient = require('@azure-rest/ai-inference').default;
const { isUnexpected } = require('@azure-rest/ai-inference');
const { AzureKeyCredential } = require('@azure/core-auth');
const logger = require('../utils/logger');

class AIConversationService {
    constructor() {
        // Initialize Deepgram for Speech-to-Text AND Text-to-Speech
        if (process.env.DEEPGRAM_API_KEY) {
            this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
            this.deepgramConfigured = true;
        } else {
            this.deepgramConfigured = false;
        }

        // Initialize GitHub Models (GPT-4o-mini) for AI conversation
        if (process.env.GITHUB_TOKEN) {
            const endpoint = "https://models.github.ai/inference";
            this.aiClient = ModelClient(endpoint, new AzureKeyCredential(process.env.GITHUB_TOKEN));
            this.model = "openai/gpt-4o-mini";
            this.aiConfigured = true;
        } else {
            this.aiConfigured = false;
        }
    }

    /**
     * Check if AI conversation is fully configured
     */
    isConfigured() {
        return !!(this.deepgramConfigured && this.aiConfigured);
    }

    /**
     * Process audio and generate AI response
     */
    async processAudio(audioBuffer, conversationContext) {
        try {
            if (!this.isConfigured()) {
                throw new Error('AI Conversation service not fully configured');
            }

            // 1. Speech-to-Text with Deepgram
            const transcript = await this.transcribeAudio(audioBuffer);

            // If no transcript was detected, return early handled in mediaStreamHandler
            if (!transcript) {
                return { transcript: '', aiResponse: '', audioBuffer: null };
            }

            logger.info('Audio transcribed', { transcript });

            // 2. Generate AI response with GitHub Models (GPT-4o-mini)
            const aiResponse = await this.generateResponse(transcript, conversationContext);
            logger.info('AI response generated', { response: aiResponse });

            // 3. Text-to-Speech with Deepgram TTS
            const audioResponse = await this.synthesizeSpeech(aiResponse);

            return {
                transcript,
                aiResponse,
                audioBuffer: audioResponse
            };
        } catch (error) {
            logger.error('Error in AI conversation processing', error);
            throw error;
        }
    }

    /**
     * Transcribe audio using Deepgram
     */
    async transcribeAudio(audioBuffer) {
        try {
            // Log buffer size for debugging
            logger.info('Transcribing audio buffer', { size: audioBuffer.length });

            const response = await this.deepgram.listen.prerecorded.transcribeFile(
                audioBuffer,
                {
                    model: 'nova-2',
                    language: 'en-IN', // Indian English
                    smart_format: true,
                    punctuate: true,
                    // Twilio sends 8-bit mulaw at 8000Hz
                    encoding: 'mulaw',
                    sample_rate: 8000,
                    container: 'none'
                }
            );

            // The Deepgram SDK v3 returns { result, error }
            if (response.error) {
                throw response.error;
            }

            const result = response.result;
            if (!result || !result.results) {
                logger.warn('Deepgram returned empty result');
                return '';
            }

            const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
            return transcript;
        } catch (error) {
            logger.error('Deepgram transcription error', error);
            // Don't throw if it's just a minor issue, return empty transcript
            return '';
        }
    }

    /**
     * Generate AI response using GitHub Models (GPT-4o-mini)
     */
    async generateResponse(userInput, context) {
        try {
            const systemPrompt = this.buildPrompt(userInput, context);

            const response = await this.aiClient.path("/chat/completions").post({
                body: {
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userInput }
                    ],
                    model: this.model,
                    temperature: 0.7,
                    max_tokens: 150,
                    top_p: 0.9
                }
            });

            if (isUnexpected(response)) {
                // Check if it's a rate limit error
                if (response.body.error?.code === 'RateLimitReached') {
                    logger.warn('GitHub Models rate limit reached, using fallback response');
                    return this.getFallbackResponse(userInput, context);
                }
                throw response.body.error;
            }

            const aiResponse = response.body.choices[0].message.content;
            return aiResponse;
        } catch (error) {
            logger.error('GitHub Models generation error', error);

            // If rate limited, provide a fallback response
            if (error.code === 'RateLimitReached' || error.message?.includes('rate limit')) {
                logger.warn('Rate limit detected, using fallback response');
                return this.getFallbackResponse(userInput, context);
            }

            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Fallback response when rate limited
     */
    getFallbackResponse(userInput, context) {
        const lowerInput = userInput.toLowerCase();

        // Simple rule-based responses
        if (lowerInput.includes('yes') || lowerInput.includes('good') || lowerInput.includes('better')) {
            return "That's wonderful to hear! Please continue taking your medications as prescribed. If you need anything else, feel free to call the clinic.";
        }

        if (lowerInput.includes('no') || lowerInput.includes('not good') || lowerInput.includes('worse')) {
            return "I understand. I recommend you schedule a follow-up appointment with your doctor. Our staff will call you to arrange this.";
        }

        return "Thank you for speaking with me. If you have any concerns, please don't hesitate to contact the clinic directly.";
    }

    /**
     * Build conversation prompt for GitHub Models
     */
    buildPrompt(userInput, context) {
        const { patient, appointment, doctor, followUp } = context;

        if (followUp) {
            // Context for follow-up call
            return `You are CareCall AI, a friendly and empathetic healthcare assistant calling ${patient.name} for a post-appointment follow-up.

PATIENT MEDICAL HISTORY:
- Conditions: ${patient.medicalHistory?.conditions?.join(', ') || 'None'}
- Allergies: ${patient.medicalHistory?.allergies?.join(', ') || 'None'}
- Current Medications: ${patient.medicalHistory?.medications?.join(', ') || 'None'}

FOLLOW-UP DETAILS:
- Purpose: ${followUp.purpose || 'General wellness check'}
- Related Appointment Date: ${followUp.appointment ? (followUp.appointment.appointmentDate ? new Date(followUp.appointment.appointmentDate).toLocaleDateString('en-IN') : 'N/A') : 'N/A'}
- Treating Doctor: Dr. ${doctor?.name || 'the doctor'}
- Doctor's Notes/Report: ${followUp.doctorReport || (followUp.metadata?.get ? followUp.metadata.get('doctorReport') : followUp.metadata?.doctorReport) || followUp.notes || 'No specific notes available.'}

CONVERSATION CONTEXT:
You are checking in to see how they are feeling after their recent visit. Be warm, professional, and empathetic. 
Base your health-related questions on their medical history (e.g., if they have diabetes, ask how their blood sugar is).

INSTRUCTIONS:
1. Ask how they are feeling today.
2. If they are feeling well → Congratulate them and remind them to keep taking their medications (${patient.medicalHistory?.medications?.join(', ') || 'as prescribed'}).
3. If they are not feeling well → Ask specific questions about their symptoms.
4. If symptoms sound concerning or they request help → Recommend scheduling a follow-up appointment or speaking with a nurse.
5. If they need another appointment → Tell them you will have the clinic staff reach out to schedule one.
6. Keep responses SHORT (2-3 sentences max) to maintain a natural pace.
7. Be empathetic and professional.

Respond naturally to what the patient says.`;
        }

        // Default: Context for appointment confirmation
        return `You are CareCall AI, a friendly and professional healthcare assistant calling ${patient.name}.

APPOINTMENT DETAILS:
- Doctor: Dr. ${doctor?.name || 'the doctor'}
- Specialization: ${doctor?.specialization || 'General'}
- Date: ${appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN') : 'N/A'}
- Time: ${appointment?.appointmentTime || 'N/A'}
- Type: ${appointment?.type || 'Consultation'}

CONVERSATION CONTEXT:
You are calling to confirm this appointment. Be warm, professional, and concise.

INSTRUCTIONS:
1. If they confirm → Thank them and confirm the details
2. If they want to reschedule → Ask for preferred date/time
3. If they want to cancel → Ask if they'd like to share why (optional)
4. If unclear → Politely ask them to clarify
5. Keep responses SHORT (1-2 sentences max)
6. Be empathetic and understanding
7. Use natural, conversational language

Respond naturally to what the patient says.`;
    }

    /**
     * Convert text to speech using Deepgram TTS
     */
    async synthesizeSpeech(text) {
        try {
            logger.info('Starting TTS conversion', { textLength: text.length });

            // Use Deepgram's speak API for TTS
            const response = await this.deepgram.speak.request(
                { text },
                {
                    model: 'aura-asteria-en', // Natural female voice
                    encoding: 'mulaw',
                    sample_rate: 8000,
                    container: 'none'
                }
            );

            logger.info('Deepgram TTS response received');

            // Get the audio stream
            const stream = await response.getStream();
            if (!stream) {
                logger.error('No audio stream returned from Deepgram TTS');
                throw new Error('No audio stream returned from Deepgram TTS');
            }

            logger.info('Audio stream obtained, reading chunks...');

            // Convert stream to buffer
            const chunks = [];
            const reader = stream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const audioBuffer = Buffer.concat(chunks);
            logger.info('TTS conversion complete', {
                bufferSize: audioBuffer.length,
                textConverted: text.substring(0, 50) + '...'
            });

            return audioBuffer;
        } catch (error) {
            logger.error('Deepgram TTS error - Full details:', {
                message: error.message,
                stack: error.stack,
                text: text
            });
            throw new Error('Failed to synthesize speech: ' + error.message);
        }
    }

    /**
     * Detect intent from user input
     */
    detectIntent(transcript) {
        const lowerTranscript = transcript.toLowerCase();

        if (lowerTranscript.includes('yes') || lowerTranscript.includes('confirm') || lowerTranscript.includes('okay')) {
            return { intent: 'confirm', confidence: 0.9 };
        }

        if (lowerTranscript.includes('reschedule') || lowerTranscript.includes('change') || lowerTranscript.includes('different time')) {
            return { intent: 'reschedule', confidence: 0.9 };
        }

        if (lowerTranscript.includes('cancel') || lowerTranscript.includes('no')) {
            return { intent: 'cancel', confidence: 0.8 };
        }

        return { intent: 'unclear', confidence: 0.5 };
    }

    /**
     * Analyze sentiment
     */
    analyzeSentiment(transcript) {
        const lowerTranscript = transcript.toLowerCase();

        const positiveWords = ['yes', 'great', 'good', 'thank', 'perfect', 'okay'];
        const negativeWords = ['no', 'cancel', 'problem', 'issue', 'cannot', 'busy'];

        const positiveCount = positiveWords.filter(word => lowerTranscript.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerTranscript.includes(word)).length;

        if (positiveCount > negativeCount) {
            return { sentiment: 'positive', score: 0.7 };
        } else if (negativeCount > positiveCount) {
            return { sentiment: 'negative', score: -0.7 };
        }

        return { sentiment: 'neutral', score: 0 };
    }
}

module.exports = new AIConversationService();
