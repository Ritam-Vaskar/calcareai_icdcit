const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientStats
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');
const {
  patientValidation,
  validateId,
  validate
} = require('../middleware/validation');

router.use(protect); // All routes require authentication

router.get('/stats', getPatientStats);
router.get('/', getPatients);
router.get('/:id', validateId, validate, getPatient);
router.post('/', patientValidation, validate, createPatient);
router.put('/:id', validateId, validate, updatePatient);
router.delete('/:id', authorize('admin'), validateId, validate, deletePatient);
router.post('/:id/followup-call', validateId, validate, require('../controllers/patientController').initiateFollowUpCall);

module.exports = router;
