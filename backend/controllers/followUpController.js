const FollowUp = require('../models/FollowUp');
const Patient = require('../models/Patient');
const CallLog = require('../models/CallLog');
const vapiService = require('../services/vapiService');
const logger = require('../utils/logger');

// @desc    Get all follow-ups
// @route   GET /api/followups
// @access  Private
exports.getFollowUps = async (req, res, next) => {
  try {
    const {
      patient,
      type,
      status,
      priority,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (patient) query.patient = patient;
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const followUps = await FollowUp.find(query)
      .populate('patient', 'name phone language')
      .populate('doctor', 'name specialization')
      .populate('appointment')
      .populate('callLog')
      .populate('assignedTo', 'name email')
      .sort({ scheduledDate: 1, priority: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FollowUp.countDocuments(query);

    res.status(200).json({
      success: true,
      count: followUps.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: { followUps }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single follow-up
// @route   GET /api/followups/:id
// @access  Private
exports.getFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('appointment')
      .populate('callLog')
      .populate('assignedTo', 'name email');

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { followUp }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create follow-up
// @route   POST /api/followups
// @access  Private
exports.createFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.create(req.body);
    
    await followUp.populate('patient doctor');

    logger.info('Follow-up created', { followUpId: followUp._id });
    logger.audit('FOLLOWUP_CREATED', req.user.email, { 
      followUpId: followUp._id,
      patientName: followUp.patient.name
    });

    res.status(201).json({
      success: true,
      message: 'Follow-up created successfully',
      data: { followUp }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update follow-up
// @route   PUT /api/followups/:id
// @access  Private
exports.updateFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patient doctor assignedTo');

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    logger.info('Follow-up updated', { followUpId: followUp._id });

    res.status(200).json({
      success: true,
      message: 'Follow-up updated successfully',
      data: { followUp }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete follow-up
// @route   DELETE /api/followups/:id
// @access  Private
exports.deleteFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    followUp.status = 'cancelled';
    await followUp.save();

    logger.info('Follow-up deleted', { followUpId: followUp._id });

    res.status(200).json({
      success: true,
      message: 'Follow-up cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate follow-up call
// @route   POST /api/followups/:id/call
// @access  Private
exports.initiateFollowUpCall = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('patient');

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    if (followUp.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Follow-up already completed'
      });
    }

    // Initiate Vapi call
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

    res.status(200).json({
      success: true,
      message: 'Follow-up call initiated successfully',
      data: {
        callLog,
        vapiCall
      }
    });
  } catch (error) {
    logger.error('Error initiating follow-up call', error);
    next(error);
  }
};

// @desc    Complete follow-up manually
// @route   PUT /api/followups/:id/complete
// @access  Private
exports.completeFollowUp = async (req, res, next) => {
  try {
    const { responses, notes, actionItems } = req.body;

    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    followUp.status = 'completed';
    followUp.completedDate = new Date();
    
    if (responses) followUp.responses = responses;
    if (notes) followUp.notes = notes;
    if (actionItems) {
      followUp.actionRequired = actionItems.length > 0;
      followUp.actionItems = actionItems;
    }

    await followUp.save();

    logger.info('Follow-up completed', { followUpId: followUp._id });
    logger.audit('FOLLOWUP_COMPLETED', req.user.email, { 
      followUpId: followUp._id
    });

    res.status(200).json({
      success: true,
      message: 'Follow-up completed successfully',
      data: { followUp }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get follow-up statistics
// @route   GET /api/followups/stats
// @access  Private
exports.getFollowUpStats = async (req, res, next) => {
  try {
    const total = await FollowUp.countDocuments();
    
    const byStatus = await FollowUp.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byType = await FollowUp.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byPriority = await FollowUp.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const pending = await FollowUp.countDocuments({
      status: 'scheduled',
      scheduledDate: { $lte: new Date() }
    });

    const actionRequired = await FollowUp.countDocuments({
      actionRequired: true,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byType,
        byPriority,
        pending,
        actionRequired
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get due follow-ups (for cron job)
// @route   GET /api/followups/due
// @access  Private
exports.getDueFollowUps = async (req, res, next) => {
  try {
    const now = new Date();
    
    const dueFollowUps = await FollowUp.find({
      status: 'scheduled',
      scheduledDate: { $lte: now },
      $expr: { $lt: ['$attempt.current', '$attempt.max'] }
    })
    .populate('patient', 'name phone language')
    .sort({ priority: -1, scheduledDate: 1 });

    res.status(200).json({
      success: true,
      count: dueFollowUps.length,
      data: { followUps: dueFollowUps }
    });
  } catch (error) {
    next(error);
  }
};
