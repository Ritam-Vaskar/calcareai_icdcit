const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAvailability,
  updateDoctorAvailability,
  getAvailableSlots
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');
const { 
  doctorValidation, 
  validateId, 
  validate 
} = require('../middleware/validation');

router.use(protect);

router.get('/', getDoctors);
router.get('/:id', validateId, validate, getDoctor);
router.post('/', authorize('admin'), doctorValidation, validate, createDoctor);
router.put('/:id', authorize('admin'), validateId, validate, updateDoctor);
router.delete('/:id', authorize('admin'), validateId, validate, deleteDoctor);

router.get('/:id/availability', validateId, validate, getDoctorAvailability);
router.put('/:id/availability', authorize('admin'), validateId, validate, updateDoctorAvailability);
router.get('/:id/slots', validateId, validate, getAvailableSlots);

module.exports = router;
