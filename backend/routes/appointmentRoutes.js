const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  initiateAppointmentCall,
  getAppointmentStats
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { 
  appointmentValidation, 
  validateId, 
  validate 
} = require('../middleware/validation');

router.use(protect);

router.get('/stats', getAppointmentStats);
router.get('/', getAppointments);
router.get('/:id', validateId, validate, getAppointment);
router.post('/', appointmentValidation, validate, createAppointment);
router.put('/:id', validateId, validate, updateAppointment);
router.put('/:id/cancel', validateId, validate, cancelAppointment);
router.post('/:id/reschedule', validateId, validate, rescheduleAppointment);
router.post('/:id/call', validateId, validate, initiateAppointmentCall);

module.exports = router;
