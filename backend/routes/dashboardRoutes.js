const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

// Get dashboard data (role-specific)
router.get('/', dashboardController.getDashboardData);

module.exports = router;
