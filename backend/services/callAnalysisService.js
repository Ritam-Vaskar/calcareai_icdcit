const CallLog = require('../models/CallLog');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const mcpAgent = require('./mcpAgent');
const logger = require('../utils/logger');

/**
 * Call Analysis Service - Analyzes call logs and triggers MCP Agent for scheduling
 */
class CallAnalysisService {

  /**
   * Analyze a call log conversation and determine if appointment is needed
   */
  async analyzeCallLog(callLogId) {
    try {
      logger.info(`Analyzing call log ${callLogId}`);

      const callLog = await CallLog.findById(callLogId)
        .populate('patient')
        .populate('appointment');

      if (!callLog) {
        throw new Error('Call log not found');
      }

      if (!callLog.conversation || callLog.conversation.length === 0) {
        throw new Error('No conversation data to analyze');
      }

      // Extract conversation text
      const conversationText = callLog.conversation
        .map(msg => `${msg.speaker}: ${msg.text}`)
        .join('\n');

      // Analyze conversation using AI
      const analysis = await this.performAIAnalysis(conversationText, callLog);

      // Update call log with analysis
      await CallLog.findByIdAndUpdate(callLogId, {
        'metadata.analysis': analysis,
        'metadata.analyzed': true,
        'metadata.analyzedAt': new Date()
      });

      logger.info('Call analysis complete', { 
        callLogId, 
        needsAppointment: analysis.needsAppointment,
        urgencyLevel: analysis.urgencyLevel 
      });

      return analysis;

    } catch (error) {
      logger.error(`Error analyzing call log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform AI analysis on conversation text
   */
  async performAIAnalysis(conversationText, callLog) {
    const lowerText = conversationText.toLowerCase();

    // Initialize analysis object
    const analysis = {
      needsAppointment: false,
      urgencyLevel: 'routine',
      suggestedSpecialization: 'general',
      symptoms: [],
      chiefComplaint: '',
      sentiment: callLog.sentiment || 'neutral',
      confidence: 0.7,
      reasoning: ''
    };

    // Check for keywords indicating need for appointment
    const appointmentKeywords = [
      'pain', 'sick', 'fever', 'hurt', 'injury', 'appointment',
      'see doctor', 'not well', 'problem', 'checkup', 'emergency',
      'bleeding', 'chest pain', 'dizzy', 'faint', 'headache',
      'cough', 'breathing', 'stomach', 'back pain', 'throat',
      'infection', 'rash', 'swelling', 'vomiting', 'nausea'
    ];

    let appointmentScore = 0;
    const detectedKeywords = [];

    for (const keyword of appointmentKeywords) {
      if (lowerText.includes(keyword)) {
        appointmentScore++;
        detectedKeywords.push(keyword);
        
        // Add to symptoms if not generic
        if (!['appointment', 'see doctor', 'checkup', 'not well', 'problem'].includes(keyword)) {
          analysis.symptoms.push(keyword);
        }
      }
    }

    // Determine if appointment is needed
    if (appointmentScore >= 2) {
      analysis.needsAppointment = true;
      analysis.chiefComplaint = detectedKeywords.slice(0, 3).join(', ');
    }

    // Determine urgency level
    const emergencyKeywords = ['chest pain', 'bleeding', 'unconscious', 'emergency', 'severe', 'can\'t breathe', 'suicide'];
    const urgentKeywords = ['fever', 'pain', 'injury', 'vomiting', 'dizzy', 'faint'];
    
    for (const keyword of emergencyKeywords) {
      if (lowerText.includes(keyword)) {
        analysis.urgencyLevel = 'emergency';
        analysis.needsAppointment = true;
        break;
      }
    }

    if (analysis.urgencyLevel !== 'emergency') {
      for (const keyword of urgentKeywords) {
        if (lowerText.includes(keyword)) {
          analysis.urgencyLevel = 'urgent';
          break;
        }
      }
    }

    // Determine specialization based on symptoms
    const specializationMap = {
      'heart': ['chest pain', 'heart', 'cardiac'],
      'orthopedic': ['bone', 'fracture', 'joint', 'back pain', 'knee', 'leg'],
      'general': ['fever', 'cold', 'cough', 'flu', 'headache', 'stomach'],
      'dermatology': ['skin', 'rash', 'itch', 'allergy'],
      'ent': ['ear', 'throat', 'nose', 'sinus'],
      'gastroenterology': ['stomach', 'digestion', 'vomit', 'diarrhea', 'nausea']
    };

    for (const [specialization, keywords] of Object.entries(specializationMap)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          analysis.suggestedSpecialization = specialization;
          break;
        }
      }
      if (analysis.suggestedSpecialization !== 'general') break;
    }

    // Generate reasoning
    if (analysis.needsAppointment) {
      analysis.reasoning = `Patient mentioned symptoms: ${detectedKeywords.join(', ')}. ` +
        `Urgency level: ${analysis.urgencyLevel}. Suggested specialization: ${analysis.suggestedSpecialization}.`;
    } else {
      analysis.reasoning = 'No significant medical concerns detected in conversation.';
    }

    // Adjust confidence based on conversation quality
    if (callLog.conversation.length < 3) {
      analysis.confidence = 0.5;
    } else if (callLog.conversation.length > 6) {
      analysis.confidence = 0.9;
    }

    return analysis;
  }

  /**
   * Analyze and schedule appointment if needed
   */
  async analyzeAndSchedule(callLogId) {
    try {
      logger.info(`Analyzing and scheduling for call log ${callLogId}`);

      // First analyze the call
      const analysis = await this.analyzeCallLog(callLogId);

      if (!analysis.needsAppointment) {
        return {
          success: true,
          scheduled: false,
          message: 'No appointment needed based on conversation analysis',
          analysis
        };
      }

      // Get call log with patient details
      const callLog = await CallLog.findById(callLogId).populate('patient');

      if (!callLog.patient) {
        throw new Error('Patient not found for this call');
      }

      // Check if appointment already exists for this call
      const existingAppointment = await Appointment.findOne({
        'metadata.callLogId': callLogId.toString()
      });

      if (existingAppointment) {
        return {
          success: true,
          scheduled: false,
          message: 'Appointment already exists for this call',
          appointment: existingAppointment,
          analysis
        };
      }

      // Find available doctor
      const doctor = await this.findAvailableDoctor(
        analysis.suggestedSpecialization,
        analysis.urgencyLevel,
        callLog.patient
      );

      if (!doctor) {
        throw new Error(`No available doctor found for specialization: ${analysis.suggestedSpecialization}`);
      }

      // Determine appointment timing
      const appointmentSlot = await this.determineAppointmentSlot(doctor, analysis.urgencyLevel);

      // Create appointment
      const appointment = await this.createAppointment(
        callLog,
        doctor,
        appointmentSlot,
        analysis
      );

      // Update call log with appointment reference
      await CallLog.findByIdAndUpdate(callLogId, {
        'metadata.appointmentScheduled': true,
        'metadata.scheduledAppointmentId': appointment._id.toString()
      });

      logger.info(`Successfully scheduled appointment ${appointment._id} from call log ${callLogId}`);

      return {
        success: true,
        scheduled: true,
        message: 'Appointment scheduled successfully',
        appointment,
        doctor,
        analysis
      };

    } catch (error) {
      logger.error(`Error in analyzeAndSchedule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find available doctor (similar to MCP agent logic)
   */
  async findAvailableDoctor(specialization, urgencyLevel, patient) {
    try {
      const query = {
        status: 'active',
        specialization: new RegExp(specialization, 'i')
      };

      let doctors = await Doctor.find(query).sort({ experience: -1 });

      if (doctors.length === 0) {
        doctors = await Doctor.find({
          status: 'active',
          specialization: /general|family|medicine/i
        });
      }

      if (doctors.length === 0) {
        return null;
      }

      if (urgencyLevel === 'emergency' || urgencyLevel === 'urgent') {
        doctors = doctors.sort((a, b) => b.experience - a.experience);
      }

      return doctors[0];

    } catch (error) {
      logger.error(`Error finding available doctor: ${error.message}`);
      throw error;
    }
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
        appointmentDate.setHours(appointmentDate.getHours() + 1);
        appointmentTime = this.roundToNearestSlot(appointmentDate);
        break;

      case 'urgent':
        if (now.getHours() >= 17) {
          appointmentDate.setDate(appointmentDate.getDate() + 1);
          appointmentTime = '09:00';
        } else {
          appointmentDate.setHours(appointmentDate.getHours() + 3);
          appointmentTime = this.roundToNearestSlot(appointmentDate);
        }
        break;

      case 'routine':
        appointmentDate.setDate(appointmentDate.getDate() + 3);
        appointmentTime = '10:00';
        break;

      default:
        appointmentDate.setDate(appointmentDate.getDate() + 2);
        appointmentTime = '10:00';
    }

    if (appointmentDate.getDay() === 0) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
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
   * Create appointment from call analysis
   */
  async createAppointment(callLog, doctor, appointmentSlot, analysis) {
    try {
      let appointmentType = 'consultation';
      if (analysis.urgencyLevel === 'emergency') {
        appointmentType = 'emergency';
      } else if (analysis.urgencyLevel === 'routine') {
        appointmentType = 'routine-checkup';
      }

      const appointment = await Appointment.create({
        patient: callLog.patient._id,
        doctor: doctor._id,
        appointmentDate: appointmentSlot.date,
        appointmentTime: appointmentSlot.time,
        duration: analysis.urgencyLevel === 'emergency' ? 60 : 30,
        type: appointmentType,
        status: analysis.urgencyLevel === 'emergency' ? 'confirmed' : 'scheduled',
        reason: analysis.chiefComplaint || 'AI Scheduled Consultation',
        symptoms: analysis.symptoms || [],
        notes: `AI Analysis from call log:\n${analysis.reasoning}\nUrgency: ${analysis.urgencyLevel}\nConfidence: ${(analysis.confidence * 100).toFixed(0)}%`,
        confirmationMethod: 'ai-call',
        metadata: {
          callLogId: callLog._id.toString(),
          aiScheduled: 'true',
          urgencyLevel: analysis.urgencyLevel,
          analysisConfidence: analysis.confidence.toString()
        }
      });

      if (!callLog.patient.assignedDoctor) {
        await Patient.findByIdAndUpdate(callLog.patient._id, {
          assignedDoctor: doctor._id
        });
      }

      return appointment;

    } catch (error) {
      logger.error(`Error creating appointment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch analyze multiple call logs
   */
  async batchAnalyze(callLogIds) {
    const results = [];
    
    for (const callLogId of callLogIds) {
      try {
        const result = await this.analyzeAndSchedule(callLogId);
        results.push({ 
          callLogId, 
          success: true, 
          ...result 
        });
      } catch (error) {
        results.push({ 
          callLogId, 
          success: false, 
          error: error.message 
        });
      }
    }

    return results;
  }
}

module.exports = new CallAnalysisService();
