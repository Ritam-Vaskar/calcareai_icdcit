const axios = require('axios');
const logger = require('../utils/logger');

class VapiService {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseURL = 'https://api.vapi.ai';
    this.assistantId = process.env.VAPI_ASSISTANT_ID;
    this.phoneNumber = process.env.VAPI_PHONE_NUMBER;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create an assistant with specific configuration
   */
  async createAssistant(config) {
    try {
      const response = await this.client.post('/assistant', {
        name: config.name || 'CareCall Assistant',
        voice: {
          provider: 'azure',
          voiceId: config.voiceId || 'en-US-JennyNeural'
        },
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: config.systemMessages || this.getDefaultSystemMessages(),
          temperature: 0.7
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: config.language || 'en'
        },
        firstMessage: config.firstMessage,
        endCallFunctionEnabled: true,
        endCallPhrases: ['goodbye', 'bye', 'thank you bye'],
        ...config
      });
      
      logger.info('Assistant created', { assistantId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Error creating assistant', error);
      throw error;
    }
  }

  /**
   * Initiate an outbound call
   */
  async makeCall(phoneNumber, assistantConfig = {}) {
    try {
      const payload = {
        phoneNumberId: this.phoneNumber,
        customer: {
          number: phoneNumber
        },
        assistantId: assistantConfig.assistantId || this.assistantId
      };

      // Override assistant config if provided
      if (assistantConfig.overrides) {
        payload.assistant = {
          ...assistantConfig.overrides,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            messages: assistantConfig.systemMessages || this.getDefaultSystemMessages()
          }
        };
      }

      const response = await this.client.post('/call/phone', payload);
      
      logger.info('Call initiated', { 
        callId: response.data.id, 
        phoneNumber 
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error making call', { 
        error: error.response?.data || error.message,
        phoneNumber 
      });
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callId) {
    try {
      const response = await this.client.get(`/call/${callId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching call', { callId, error: error.message });
      throw error;
    }
  }

  /**
   * End an ongoing call
   */
  async endCall(callId) {
    try {
      const response = await this.client.post(`/call/${callId}/end`);
      logger.info('Call ended', { callId });
      return response.data;
    } catch (error) {
      logger.error('Error ending call', { callId, error: error.message });
      throw error;
    }
  }

  /**
   * Get system messages for appointment confirmation
   */
  getAppointmentConfirmationMessages(patientName, doctorName, appointmentDate, appointmentTime) {
    return [
      {
        role: 'system',
        content: `You are CareCall AI, a friendly and professional healthcare assistant. 
        
Your task is to call ${patientName} to confirm their upcoming appointment.

APPOINTMENT DETAILS:
- Doctor: ${doctorName}
- Date: ${appointmentDate}
- Time: ${appointmentTime}

CONVERSATION FLOW:
1. Greet the patient warmly
2. Introduce yourself as CareCall AI from the clinic
3. Confirm you're speaking with ${patientName}
4. Inform about the appointment details
5. Ask if they can confirm the appointment
6. If they want to reschedule, ask for preferred date/time
7. If they want to cancel, ask for the reason (optional)
8. Thank them and end the call politely

HANDLING RESPONSES:
- CONFIRM: "Great! Your appointment is confirmed. See you on [date] at [time]."
- RESCHEDULE: "I understand. What date and time works better for you?"
- CANCEL: "I understand. Would you like to share why you need to cancel? (Optional)"
- UNCLEAR: Politely ask them to clarify

Be empathetic, clear, and professional. Speak naturally in a conversational tone.
If the patient has questions you can't answer, offer to have staff call them back.`
      }
    ];
  }

  /**
   * Get system messages for follow-up call
   */
  getFollowUpMessages(patientName, followUpType, questions) {
    const questionsList = questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');
    
    return [
      {
        role: 'system',
        content: `You are CareCall AI, calling ${patientName} for a ${followUpType} follow-up.

CONVERSATION FLOW:
1. Greet warmly and introduce yourself
2. Confirm you're speaking with ${patientName}
3. Explain this is a follow-up call to check on their health
4. Ask the following questions:

${questionsList}

5. Listen carefully to their responses
6. If they mention any concerns or symptoms, note them
7. Thank them for their time
8. If urgent issues mentioned, inform them staff will call back soon

Be caring, patient, and attentive. Create a comfortable environment for them to share.
Speak in a natural, conversational manner.`
      }
    ];
  }

  /**
   * Get default system messages
   */
  getDefaultSystemMessages() {
    return [
      {
        role: 'system',
        content: `You are CareCall AI, a helpful and professional healthcare voice assistant.
        
You help patients with:
- Appointment confirmations
- Appointment rescheduling
- Follow-up health checks
- General queries

Always be:
- Warm and empathetic
- Clear and concise
- Professional
- Patient and understanding

If you don't know something, offer to have a staff member call back.
Never provide medical advice - only handle administrative tasks and basic queries.`
      }
    ];
  }

  /**
   * Make appointment confirmation call
   */
  async makeAppointmentCall(patient, appointment) {
    const systemMessages = this.getAppointmentConfirmationMessages(
      patient.name,
      appointment.doctor?.name || 'your doctor',
      new Date(appointment.appointmentDate).toLocaleDateString(),
      appointment.appointmentTime
    );

    const firstMessage = `Hello! This is CareCall AI calling from the clinic. May I speak with ${patient.name}?`;

    return await this.makeCall(patient.phone, {
      systemMessages,
      overrides: {
        firstMessage,
        voice: {
          provider: 'azure',
          voiceId: this.getVoiceForLanguage(patient.language)
        }
      }
    });
  }

  /**
   * Make follow-up call
   */
  async makeFollowUpCall(patient, followUp) {
    const systemMessages = this.getFollowUpMessages(
      patient.name,
      followUp.type,
      followUp.questions || []
    );

    const firstMessage = `Hello! This is CareCall AI calling for a health check-in. May I speak with ${patient.name}?`;

    return await this.makeCall(patient.phone, {
      systemMessages,
      overrides: {
        firstMessage,
        voice: {
          provider: 'azure',
          voiceId: this.getVoiceForLanguage(patient.language)
        }
      }
    });
  }

  /**
   * Get appropriate voice for language
   */
  getVoiceForLanguage(language) {
    const voices = {
      'english': 'en-US-JennyNeural',
      'hindi': 'hi-IN-SwaraNeural',
      'bengali': 'bn-IN-TanishaaNeural',
      'tamil': 'ta-IN-PallaviNeural',
      'telugu': 'te-IN-ShrutiNeural',
      'marathi': 'mr-IN-AarohiNeural',
      'gujarati': 'gu-IN-DhwaniNeural'
    };
    
    return voices[language?.toLowerCase()] || voices['english'];
  }

  /**
   * Extract intent from transcript
   */
  extractIntent(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    const intents = {
      confirm: ['yes', 'confirm', 'sure', 'okay', 'alright', 'correct', 'that works'],
      reschedule: ['reschedule', 'change', 'different time', 'another day', 'postpone'],
      cancel: ['cancel', 'not coming', 'can\'t make it', 'won\'t be able'],
      query: ['question', 'what', 'when', 'where', 'how', 'why'],
      emergency: ['urgent', 'emergency', 'pain', 'severe', 'immediately']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
        return intent;
      }
    }

    return 'unclear';
  }

  /**
   * Analyze sentiment (basic)
   */
  analyzeSentiment(transcript) {
    const positiveWords = ['good', 'great', 'thanks', 'thank you', 'fine', 'well', 'better', 'happy'];
    const negativeWords = ['bad', 'pain', 'worse', 'problem', 'issue', 'concern', 'worried', 'not good'];
    
    const lowerTranscript = transcript.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerTranscript.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerTranscript.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', score: 0.7 };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', score: -0.7 };
    } else if (positiveCount === 0 && negativeCount === 0) {
      return { sentiment: 'neutral', score: 0 };
    } else {
      return { sentiment: 'mixed', score: 0 };
    }
  }
}

module.exports = new VapiService();
