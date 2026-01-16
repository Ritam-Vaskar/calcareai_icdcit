const express = require('express');
const router = express.Router();
const {
  getCallLogs,
  getCallLog,
  getCallAnalytics,
  getAIPerformance,
  exportCallLogs
} = require('../controllers/callLogController');
const { protect } = require('../middleware/auth');
const { validateId, validate } = require('../middleware/validation');

router.use(protect);

router.get('/analytics', getCallAnalytics);
router.get('/ai-performance', getAIPerformance);
router.get('/export', exportCallLogs);
router.get('/', getCallLogs);
router.get('/:id', validateId, validate, getCallLog);

module.exports = router;
