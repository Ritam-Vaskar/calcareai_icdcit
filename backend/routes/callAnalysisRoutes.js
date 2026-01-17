const express = require('express');
const router = express.Router();
const callAnalysisService = require('../services/callAnalysisService');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @desc    Analyze a call log conversation
 * @route   POST /api/call-analysis/:callLogId/analyze
 * @access  Private
 */
router.post('/:callLogId/analyze', protect, async (req, res, next) => {
  try {
    const analysis = await callAnalysisService.analyzeCallLog(req.params.callLogId);

    res.json({
      success: true,
      data: { analysis }
    });
  } catch (error) {
    logger.error('Error analyzing call log', error);
    next(error);
  }
});

/**
 * @desc    Analyze call log and schedule appointment if needed
 * @route   POST /api/call-analysis/:callLogId/schedule
 * @access  Private
 */
router.post('/:callLogId/schedule', protect, async (req, res, next) => {
  try {
    const result = await callAnalysisService.analyzeAndSchedule(req.params.callLogId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error analyzing and scheduling', error);
    next(error);
  }
});

/**
 * @desc    Batch analyze multiple call logs
 * @route   POST /api/call-analysis/batch/schedule
 * @access  Private
 */
router.post('/batch/schedule', protect, async (req, res, next) => {
  try {
    const { callLogIds } = req.body;

    if (!callLogIds || !Array.isArray(callLogIds)) {
      return res.status(400).json({
        success: false,
        message: 'callLogIds array is required'
      });
    }

    const results = await callAnalysisService.batchAnalyze(callLogIds);

    res.json({
      success: true,
      data: { results }
    });
  } catch (error) {
    logger.error('Error batch analyzing', error);
    next(error);
  }
});

module.exports = router;
