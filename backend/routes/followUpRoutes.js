const express = require('express');
const router = express.Router();
const {
  getFollowUps,
  getFollowUp,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  initiateFollowUpCall,
  completeFollowUp,
  getFollowUpStats,
  getDueFollowUps
} = require('../controllers/followUpController');
const { protect } = require('../middleware/auth');
const { 
  followUpValidation, 
  validateId, 
  validate 
} = require('../middleware/validation');

router.use(protect);

router.get('/stats', getFollowUpStats);
router.get('/due', getDueFollowUps);
router.get('/', getFollowUps);
router.get('/:id', validateId, validate, getFollowUp);
router.post('/', followUpValidation, validate, createFollowUp);
router.put('/:id', validateId, validate, updateFollowUp);
router.delete('/:id', validateId, validate, deleteFollowUp);
router.post('/:id/call', validateId, validate, initiateFollowUpCall);
router.put('/:id/complete', validateId, validate, completeFollowUp);

module.exports = router;
