const Conversation = require('../models/Conversation');
const mcpAgent = require('../services/mcpAgent');
const logger = require('../utils/logger');

/**
 * Get all conversations
 */
exports.getAllConversations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      processed, 
      urgencyLevel, 
      patient 
    } = req.query;

    const query = {};
    if (processed !== undefined) {
      query.processed = processed === 'true';
    }
    if (urgencyLevel) {
      query['analysis.urgencyLevel'] = urgencyLevel;
    }
    if (patient) {
      query.patient = patient;
    }

    const conversations = await Conversation.find(query)
      .populate('patient', 'name phone email age gender')
      .populate('assignedDoctor', 'name specialization')
      .populate('scheduledAppointment')
      .sort({ conversationDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Conversation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: conversations,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching conversations: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

/**
 * Get conversation by ID
 */
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('patient')
      .populate('assignedDoctor')
      .populate('scheduledAppointment')
      .populate('callLog');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error(`Error fetching conversation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

/**
 * Create a new conversation (for manual entry or testing)
 */
exports.createConversation = async (req, res) => {
  try {
    const conversation = await Conversation.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation
    });
  } catch (error) {
    logger.error(`Error creating conversation: ${error.message}`);
    res.status(400).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message
    });
  }
};

/**
 * Process a conversation with MCP Agent
 */
exports.processConversation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await mcpAgent.processConversation(id);

    res.status(200).json({
      success: true,
      message: 'Conversation processed successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error processing conversation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error processing conversation',
      error: error.message
    });
  }
};

/**
 * Process all pending conversations
 */
exports.processAllPending = async (req, res) => {
  try {
    const results = await mcpAgent.processAllPending();

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Processed ${results.length} conversations`,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }
    });
  } catch (error) {
    logger.error(`Error processing pending conversations: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error processing pending conversations',
      error: error.message
    });
  }
};

/**
 * Get conversation statistics
 */
exports.getConversationStats = async (req, res) => {
  try {
    const totalConversations = await Conversation.countDocuments();
    const processedConversations = await Conversation.countDocuments({ processed: true });
    const pendingConversations = await Conversation.countDocuments({ processed: false });
    
    const urgencyBreakdown = await Conversation.aggregate([
      {
        $group: {
          _id: '$analysis.urgencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const specializationBreakdown = await Conversation.aggregate([
      {
        $group: {
          _id: '$analysis.suggestedSpecialization',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalConversations,
        processed: processedConversations,
        pending: pendingConversations,
        urgencyBreakdown,
        specializationBreakdown
      }
    });
  } catch (error) {
    logger.error(`Error fetching conversation stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation statistics',
      error: error.message
    });
  }
};
