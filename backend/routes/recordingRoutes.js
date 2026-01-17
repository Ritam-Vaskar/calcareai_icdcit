const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const CallLog = require('../models/CallLog');
const logger = require('../utils/logger');

/**
 * @desc    Proxy Twilio recording with authentication
 * @route   GET /api/recordings/:callLogId
 * @access  Private
 */
router.get('/:callLogId', protect, async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.callLogId);

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found'
      });
    }

    // Get recording URL
    let recordingUrl = callLog.recording;
    
    // Handle nested recording object
    if (typeof recordingUrl === 'object' && recordingUrl.url) {
      recordingUrl = recordingUrl.url;
    }

    if (!recordingUrl) {
      return res.status(404).json({
        success: false,
        message: 'No recording available for this call'
      });
    }

    // Ensure it's an absolute URL
    if (!recordingUrl.startsWith('http')) {
      recordingUrl = `https://api.twilio.com${recordingUrl}`;
    }

    // Add .mp3 if not present
    if (!recordingUrl.includes('.mp3') && !recordingUrl.includes('.wav')) {
      recordingUrl = `${recordingUrl}.mp3`;
    }

    // Fetch recording from Twilio with authentication
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({
        success: false,
        message: 'Twilio credentials not configured'
      });
    }

    logger.info('Fetching recording from Twilio', { 
      callLogId: req.params.callLogId,
      url: recordingUrl 
    });

    // Fetch with basic auth
    const response = await axios.get(recordingUrl, {
      auth: {
        username: accountSid,
        password: authToken
      },
      responseType: 'stream'
    });

    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="recording-${callLog.callId}.mp3"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Pipe the audio stream to response
    response.data.pipe(res);

  } catch (error) {
    logger.error('Error fetching recording', {
      error: error.message,
      callLogId: req.params.callLogId
    });

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found on Twilio'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch recording'
    });
  }
});

/**
 * @desc    Get recording URL with token
 * @route   GET /api/recordings/:callLogId/url
 * @access  Private
 */
router.get('/:callLogId/url', protect, async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.callLogId);

    if (!callLog || !callLog.recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Return the proxied URL instead of direct Twilio URL
    const proxyUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/recordings/${callLog._id}`;

    res.json({
      success: true,
      data: {
        url: proxyUrl,
        callId: callLog.callId,
        duration: callLog.duration
      }
    });

  } catch (error) {
    logger.error('Error getting recording URL', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recording URL'
    });
  }
});

module.exports = router;
