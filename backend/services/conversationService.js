const { createClient } = require('@deepgram/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class ConversationService {
  constructor() {
    // Initialize Deepgram for Speech-to-Text
    if (process.env.DEEPGRAM_API_KEY) {
      this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    }

    // Initialize Google Gemini for LLM
    if (process.env.GOOGLE_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    this.conversations = new Map(); // Store active conversations
  }

  /**
   * Initialize a new conversation
   */
  initConversation(appointmentId, patient, appointment) {
    const systemPrompt = this.generateSystemPrompt(patient, appointment);
    
    const conversation = {
      appointmentId,
      patient,
      appointment,
      systemPrompt,
      history: [],
      transcript: [],
      intent: null,
      sentiment: 'neutral'
    };

    this.conversations.set(appointmentId, conversation);
    
    logger.info('Conversation initialized', { appointmentId });
    
    return conversation;
  }

  /**
   * Generate system prompt for the conversation
   */
  generateSystemPrompt(patient, appointment) {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-IN');
    const appointmentTime = appointment.appointmentTime;

    return `You are CareCall AI, a friendly and professional healthcare assistant calling on behalf of a clinic.

PATIENT INFORMATION:
- Name: ${patient.name}
- Language: ${patient.language || 'English'}

APPOINTMENT DETAILS:
- Doctor: ${appointment.doctor?.name || 'the doctor'}
- Date: ${appointmentDate}
- Time: ${appointmentTime}
- Type: ${appointment.type || 'consultation'}

YOUR TASK:
1. Greet the patient warmly in ${patient.language || 'English'}
2. Introduce yourself as CareCall AI from the clinic
3. Confirm you're speaking with ${patient.name}
4. Inform about the appointment details
5. Ask if they can confirm the appointment
6. Handle their response:
   - CONFIRM: Thank them and confirm the appointment
   - RESCHEDULE: Ask for preferred date/time
   - CANCEL: Ask for reason (optional) and confirm cancellation
   - UNCLEAR: Politely ask them to clarify

CONVERSATION GUIDELINES:
- Be empathetic, clear, and professional
- Speak naturally in a conversational tone
- Keep responses concise (2-3 sentences max)
- If patient has questions you can't answer, offer to have staff call back
- Always end the call politely

IMPORTANT:
- Detect the patient's intent (confirm/reschedule/cancel/unclear)
- Assess sentiment (positive/neutral/negative)
- Keep the conversation focused on the appointment`;
  }

  /**
   * Process speech input and generate response
   */
  async processInput(appointmentId, audioText) {
    try {
      const conversation = this.conversations.get(appointmentId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Add user input to transcript
      conversation.transcript.push({
        role: 'user',
        text: audioText,
        timestamp: new Date()
      });

      // Build conversation history for LLM
      const messages = [
        { role: 'user', parts: [{ text: conversation.systemPrompt }] },
        ...conversation.history
      ];

      // Add current user input
      messages.push({
        role: 'user',
        parts: [{ text: audioText }]
      });

      // Get response from Gemini
      const chat = this.model.startChat({ history: messages.slice(0, -1) });
      const result = await chat.sendMessage(audioText);
      const response = result.response.text();

      // Detect intent and sentiment
      const intent = this.detectIntent(audioText);
      const sentiment = this.detectSentiment(audioText);

      conversation.intent = intent;
      conversation.sentiment = sentiment;

      // Add AI response to transcript
      conversation.transcript.push({
        role: 'assistant',
        text: response,
        timestamp: new Date(),
        intent,
        sentiment
      });

      // Update history
      conversation.history.push(
        { role: 'user', parts: [{ text: audioText }] },
        { role: 'model', parts: [{ text: response }] }
      );

      logger.info('Conversation processed', {
        appointmentId,
        intent,
        sentiment
      });

      return {
        response,
        intent,
        sentiment,
        shouldEndCall: this.shouldEndCall(response, intent)
      };
    } catch (error) {
      logger.error('Error processing conversation', {
        error: error.message,
        appointmentId
      });
      throw error;
    }
  }

  /**
   * Detect user intent
   */
  detectIntent(text) {
    const lowerText = text.toLowerCase();

    // Confirmation keywords
    if (lowerText.match(/\b(yes|confirm|ok|sure|definitely|absolutely)\b/)) {
      return 'confirm';
    }

    // Rescheduling keywords
    if (lowerText.match(/\b(reschedule|change|different|another|postpone)\b/)) {
      return 'reschedule';
    }

    // Cancellation keywords
    if (lowerText.match(/\b(cancel|no|not coming|can't make)\b/)) {
      return 'cancel';
    }

    // Query keywords
    if (lowerText.match(/\b(what|when|where|who|how|why)\b/)) {
      return 'query';
    }

    return 'unclear';
  }

  /**
   * Detect sentiment
   */
  detectSentiment(text) {
    const lowerText = text.toLowerCase();

    // Positive indicators
    const positiveWords = ['thank', 'great', 'good', 'yes', 'sure', 'happy', 'appreciate'];
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;

    // Negative indicators
    const negativeWords = ['no', 'not', 'can\'t', 'won\'t', 'don\'t', 'problem', 'issue', 'angry'];
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Determine if call should end
   */
  shouldEndCall(response, intent) {
    const lowerResponse = response.toLowerCase();
    
    // End call if we've confirmed, rescheduled, or cancelled
    if (intent === 'confirm' && lowerResponse.includes('confirmed')) {
      return true;
    }

    if (intent === 'cancel' && lowerResponse.includes('cancelled')) {
      return true;
    }

    // End if saying goodbye
    if (lowerResponse.match(/\b(goodbye|bye|thank you for calling)\b/)) {
      return true;
    }

    return false;
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(appointmentId) {
    const conversation = this.conversations.get(appointmentId);
    if (!conversation) {
      return null;
    }

    return {
      transcript: conversation.transcript,
      intent: conversation.intent,
      sentiment: conversation.sentiment,
      duration: conversation.transcript.length
    };
  }

  /**
   * End conversation
   */
  endConversation(appointmentId) {
    const summary = this.getConversationSummary(appointmentId);
    this.conversations.delete(appointmentId);
    
    logger.info('Conversation ended', { appointmentId });
    
    return summary;
  }
}

module.exports = new ConversationService();
