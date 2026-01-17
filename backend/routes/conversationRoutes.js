const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get conversation statistics (admin only)
router.get('/stats', authorize('admin'), conversationController.getConversationStats);

// Process all pending conversations (admin only)
router.post('/process-all', authorize('admin'), conversationController.processAllPending);

// Get all conversations
router.get('/', conversationController.getAllConversations);

// Create a new conversation
router.post('/', conversationController.createConversation);

// Get conversation by ID
router.get('/:id', conversationController.getConversationById);

// Process a specific conversation
router.post('/:id/process', conversationController.processConversation);

module.exports = router;
