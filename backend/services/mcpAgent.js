const Conversation = require('../models/Conversation');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');

/**
 * MCP Agent - Manager Agent for analyzing conversations and scheduling appointments
 * This agent processes patient conversations, determines urgency, finds suitable doctors,
 * and automatically schedules appointments based on the analysis.
 */
class MCPAgent {
  
  /**
   * Process a conversation and schedule an appointment
   * @param {String} conversationId - The conversation ID to process
   */
  async processConversation(conversationId) {
    try {
      logger.info(`MCP Agent: Processing conversation ${conversationId}`);
      
      // Get the conversation
      const conversation = await Conversation.findById(conversationId)
        .populate('patient');
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.processed) {
        logger.info(`Conversation ${conversationId} already processed`);
        return conversation;
      }

      // Update status to analyzing
      conversation.processingStatus = 'analyzing';
      await conversation.save();

      // Step 1: Analyze the conversation (already done by AI, but we validate)
      const analysis = conversation.analysis;
      if (!analysis || !analysis.urgencyLevel || !analysis.suggestedSpecialization) {
        throw new Error('Incomplete conversation analysis');
      }

      logger.info(`Analysis: Urgency=${analysis.urgencyLevel}, Specialization=${analysis.suggestedSpecialization}`);

      // Step 2: Find suitable doctors based on specialization and urgency
      const availableDoctor = await this.findAvailableDoctor(
        analysis.suggestedSpecialization,
        analysis.urgencyLevel,
        conversation.patient
      );

      if (!availableDoctor) {
        throw new Error(`No available doctor found for specialization: ${analysis.suggestedSpecialization}`);
      }

      logger.info(`Found available doctor: ${availableDoctor.name} (${availableDoctor.specialization})`);

      // Step 3: Determine appointment timing based on urgency
      const appointmentSlot = await this.determineAppointmentSlot(
        availableDoctor,
        analysis.urgencyLevel
      );

      // Update status to scheduling
      conversation.processingStatus = 'scheduling';
      await conversation.save();

      // Step 4: Create the appointment
      const appointment = await this.createAppointment(
        conversation,
        availableDoctor,
        appointmentSlot
      );

      // Step 5: Update conversation with results
      conversation.processed = true;
      conversation.processedAt = new Date();
      conversation.processingStatus = 'completed';
      conversation.assignedDoctor = availableDoctor._id;
      conversation.scheduledAppointment = appointment._id;
      conversation.schedulingReason = `Automated scheduling based on ${analysis.urgencyLevel} urgency and ${analysis.suggestedSpecialization} specialization`;
      await conversation.save();

      logger.info(`Successfully scheduled appointment ${appointment._id} for patient ${conversation.patient.name}`);

      return {
        conversation,
        appointment,
        doctor: availableDoctor
      };

    } catch (error) {
      logger.error(`MCP Agent Error: ${error.message}`);
      
      // Update conversation with error
      await Conversation.findByIdAndUpdate(conversationId, {
        processingStatus: 'failed',
        processingError: error.message
      });

      throw error;
    }
  }

  /**
   * Find an available doctor based on specialization and urgency
   */
  async findAvailableDoctor(specialization, urgencyLevel, patient) {
    try {
      // Build query based on specialization (case-insensitive partial match)
      const query = {
        status: 'active',
        specialization: new RegExp(specialization, 'i')
      };

      // Get all matching doctors
      let doctors = await Doctor.find(query).sort({ experience: -1 });

      if (doctors.length === 0) {
        // Fallback: Try to find any general practitioner
        doctors = await Doctor.find({
          status: 'active',
          specialization: /general|family|medicine/i
        });
      }

      if (doctors.length === 0) {
        return null;
      }

      // For emergency cases, prefer doctors with more experience
      if (urgencyLevel === 'emergency' || urgencyLevel === 'urgent') {
        doctors = doctors.sort((a, b) => b.experience - a.experience);
      }

      // Check availability schedule for each doctor
      for (const doctor of doctors) {
        const hasAvailability = await this.checkDoctorAvailability(doctor, urgencyLevel);
        if (hasAvailability) {
          return doctor;
        }
      }

      // If no one has availability, return the first matching doctor anyway
      // (in real system, this would trigger notification to admin)
      return doctors[0];

    } catch (error) {
      logger.error(`Error finding available doctor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if doctor has availability in their schedule
   */
  async checkDoctorAvailability(doctor, urgencyLevel) {
    const now = new Date();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    
    const daySchedule = doctor.availability[dayName];
    
    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.slots || daySchedule.slots.length === 0) {
      // For emergencies, doctor is considered available even without schedule
      return urgencyLevel === 'emergency';
    }

    return true;
  }

  /**
   * Determine appointment slot based on urgency
   */
  async determineAppointmentSlot(doctor, urgencyLevel) {
    const now = new Date();
    let appointmentDate = new Date();
    let appointmentTime = '';

    switch (urgencyLevel) {
      case 'emergency':
        // Emergency: Schedule ASAP (within next 2 hours)
        appointmentDate.setHours(appointmentDate.getHours() + 1);
        appointmentTime = this.roundToNearestSlot(appointmentDate);
        break;

      case 'urgent':
        // Urgent: Schedule within 24 hours
        if (now.getHours() >= 17) {
          // After 5 PM, schedule for next day morning
          appointmentDate.setDate(appointmentDate.getDate() + 1);
          appointmentTime = '09:00';
        } else {
          // Schedule within few hours
          appointmentDate.setHours(appointmentDate.getHours() + 3);
          appointmentTime = this.roundToNearestSlot(appointmentDate);
        }
        break;

      case 'routine':
        // Routine: Schedule within 3-5 days
        appointmentDate.setDate(appointmentDate.getDate() + 3);
        appointmentTime = this.findBestSlotInDay(doctor, appointmentDate);
        break;

      case 'follow-up':
        // Follow-up: Schedule within 7-10 days
        appointmentDate.setDate(appointmentDate.getDate() + 7);
        appointmentTime = this.findBestSlotInDay(doctor, appointmentDate);
        break;

      default:
        appointmentDate.setDate(appointmentDate.getDate() + 2);
        appointmentTime = '10:00';
    }

    // Ensure appointment is during working hours
    if (appointmentDate.getDay() === 0) {
      appointmentDate.setDate(appointmentDate.getDate() + 1); // Skip Sunday
    }

    return {
      date: appointmentDate,
      time: appointmentTime
    };
  }

  /**
   * Round time to nearest 30-minute slot
   */
  roundToNearestSlot(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    const roundedMinutes = minutes < 30 ? '00' : '30';
    const roundedHours = minutes >= 45 ? (hours + 1) % 24 : hours;
    
    return `${String(roundedHours).padStart(2, '0')}:${roundedMinutes}`;
  }

  /**
   * Find best available slot in a day
   */
  findBestSlotInDay(doctor, date) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const daySchedule = doctor.availability[dayName];

    if (daySchedule && daySchedule.isAvailable && daySchedule.slots && daySchedule.slots.length > 0) {
      // Return the first available slot
      return daySchedule.slots[0].startTime;
    }

    // Default to 10:00 AM
    return '10:00';
  }

  /**
   * Create an appointment based on conversation analysis
   */
  async createAppointment(conversation, doctor, appointmentSlot) {
    try {
      const analysis = conversation.analysis;

      // Determine appointment type based on urgency
      let appointmentType = 'consultation';
      if (analysis.urgencyLevel === 'emergency') {
        appointmentType = 'emergency';
      } else if (analysis.urgencyLevel === 'follow-up') {
        appointmentType = 'follow-up';
      } else if (analysis.urgencyLevel === 'routine') {
        appointmentType = 'routine-checkup';
      }

      // Create the appointment
      const appointment = await Appointment.create({
        patient: conversation.patient._id,
        doctor: doctor._id,
        appointmentDate: appointmentSlot.date,
        appointmentTime: appointmentSlot.time,
        duration: analysis.urgencyLevel === 'emergency' ? 60 : 30,
        type: appointmentType,
        status: analysis.urgencyLevel === 'emergency' ? 'confirmed' : 'scheduled',
        reason: analysis.chiefComplaint || 'AI Scheduled Consultation',
        symptoms: analysis.symptoms || [],
        notes: `AI Analysis: ${analysis.additionalNotes || ''}\nUrgency: ${analysis.urgencyLevel}\nSentiment: ${analysis.sentiment || 'N/A'}`,
        confirmationMethod: 'ai-call',
        metadata: {
          conversationId: conversation._id.toString(),
          aiScheduled: 'true',
          painLevel: analysis.painLevel ? analysis.painLevel.toString() : 'N/A',
          urgencyLevel: analysis.urgencyLevel
        }
      });

      logger.info(`Created appointment ${appointment._id}`);

      // Update patient's assigned doctor if not set
      if (!conversation.patient.assignedDoctor) {
        await Patient.findByIdAndUpdate(conversation.patient._id, {
          assignedDoctor: doctor._id,
          lastVisit: appointmentSlot.date
        });
      }

      return appointment;

    } catch (error) {
      logger.error(`Error creating appointment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process all pending conversations
   */
  async processAllPending() {
    try {
      const pendingConversations = await Conversation.find({
        processed: false,
        processingStatus: { $in: ['pending', 'failed'] }
      }).limit(10);

      logger.info(`Found ${pendingConversations.length} pending conversations to process`);

      const results = [];
      for (const conversation of pendingConversations) {
        try {
          const result = await this.processConversation(conversation._id);
          results.push({ success: true, conversationId: conversation._id, result });
        } catch (error) {
          results.push({ success: false, conversationId: conversation._id, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error processing pending conversations: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new MCPAgent();
