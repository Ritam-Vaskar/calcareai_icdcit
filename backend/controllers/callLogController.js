const CallLog = require('../models/CallLog');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const logger = require('../utils/logger');

// @desc    Get all call logs
// @route   GET /api/calls
// @access  Private
exports.getCallLogs = async (req, res, next) => {
  try {
    const {
      patient,
      callType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (patient) query.patient = patient;
    if (callType) query.callType = callType;
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.startTime = {};
      if (dateFrom) query.startTime.$gte = new Date(dateFrom);
      if (dateTo) query.startTime.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const calls = await CallLog.find(query)
      .populate('patient', 'name phone')
      .populate('appointment')
      .populate('followUp')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CallLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: calls.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: { calls }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single call log
// @route   GET /api/calls/:id
// @access  Private
exports.getCallLog = async (req, res, next) => {
  try {
    const call = await CallLog.findById(req.params.id)
      .populate('patient')
      .populate('appointment')
      .populate('followUp');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get call analytics
// @route   GET /api/calls/analytics
// @access  Private
exports.getCallAnalytics = async (req, res, next) => {
  try {
    const totalCalls = await CallLog.countDocuments();
    
    const callsByStatus = await CallLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const callsByType = await CallLog.aggregate([
      { $group: { _id: '$callType', count: { $sum: 1 } } }
    ]);

    const callsByOutcome = await CallLog.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 } } }
    ]);

    const successfulCalls = await CallLog.countDocuments({
      status: { $in: ['answered', 'completed'] },
      outcome: { $in: ['appointment-confirmed', 'follow-up-completed'] }
    });

    const averageDuration = await CallLog.aggregate([
      { $match: { duration: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    const totalCost = await CallLog.aggregate([
      { $group: { _id: null, totalCost: { $sum: '$cost' } } }
    ]);

    const sentimentDistribution = await CallLog.aggregate([
      { $match: { sentiment: { $exists: true } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ]);

    // Recent calls for timeline
    const recentCalls = await CallLog.find()
      .populate('patient', 'name')
      .sort({ startTime: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalCalls,
        successfulCalls,
        successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0,
        callsByStatus,
        callsByType,
        callsByOutcome,
        averageDuration: averageDuration[0]?.avgDuration || 0,
        totalCost: totalCost[0]?.totalCost || 0,
        sentimentDistribution,
        recentCalls
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI performance metrics
// @route   GET /api/calls/ai-performance
// @access  Private
exports.getAIPerformance = async (req, res, next) => {
  try {
    // Intent detection accuracy (simulated)
    const intentStats = await CallLog.aggregate([
      { $match: { 'intent.detected': { $exists: true } } },
      {
        $group: {
          _id: '$intent.detected',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$intent.confidence' }
        }
      }
    ]);

    // Sentiment analysis
    const sentimentStats = await CallLog.aggregate([
      { $match: { sentiment: { $exists: true } } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          avgScore: { $avg: '$sentimentScore' }
        }
      }
    ]);

    // Language usage
    const languageStats = await CallLog.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ]);

    // Call success by language
    const successByLanguage = await CallLog.aggregate([
      {
        $match: {
          outcome: { $in: ['appointment-confirmed', 'follow-up-completed'] }
        }
      },
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ]);

    // Average retry count
    const avgRetries = await CallLog.aggregate([
      { $group: { _id: null, avgRetries: { $avg: '$retryCount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        intentStats,
        sentimentStats,
        languageStats,
        successByLanguage,
        avgRetries: avgRetries[0]?.avgRetries || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export call logs to CSV
// @route   GET /api/calls/export
// @access  Private
exports.exportCallLogs = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const query = {};
    if (dateFrom || dateTo) {
      query.startTime = {};
      if (dateFrom) query.startTime.$gte = new Date(dateFrom);
      if (dateTo) query.startTime.$lte = new Date(dateTo);
    }

    const calls = await CallLog.find(query)
      .populate('patient', 'name phone')
      .populate('appointment')
      .sort({ startTime: -1 });

    // Convert to CSV format
    const csvRows = [
      ['Call ID', 'Patient', 'Phone', 'Type', 'Status', 'Duration', 'Intent', 'Sentiment', 'Outcome', 'Date']
    ];

    calls.forEach(call => {
      csvRows.push([
        call.callId,
        call.patient?.name || 'N/A',
        call.patient?.phone || 'N/A',
        call.callType,
        call.status,
        call.duration,
        call.intent?.detected || 'N/A',
        call.sentiment || 'N/A',
        call.outcome || 'N/A',
        call.startTime.toISOString()
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=call-logs.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
