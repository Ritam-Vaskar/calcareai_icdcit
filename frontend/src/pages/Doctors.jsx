import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { doctorService } from '../services';

const SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist',
  'Orthopedic', 'Gynecologist', 'Neurologist', 'ENT Specialist'
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    licenseNumber: '',
    experience: '',
    consultationFee: '',
    availability: []
  });

  useEffect(() => {
    fetchDoctors();
  }, [currentPage, searchTerm]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorService.getDoctors({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });
      setDoctors(response.data.doctors);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await doctorService.updateDoctor(editingDoctor._id, formData);
        toast.success('Doctor updated successfully');
      } else {
        await doctorService.createDoctor(formData);
        toast.success('Doctor created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchDoctors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await doctorService.deleteDoctor(id);
      toast.success('Doctor deleted successfully');
      fetchDoctors();
    } catch (error) {
      toast.error('Failed to delete doctor');
    }
  };

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber,
      experience: doctor.experience,
      consultationFee: doctor.consultationFee,
      availability: doctor.availability || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      licenseNumber: '',
      experience: '',
      consultationFee: '',
      availability: []
    });
    setEditingDoctor(null);
  };

  const addAvailabilitySlot = () => {
    setFormData({
      ...formData,
      availability: [...formData.availability, { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }]
    });
  };

  const updateAvailabilitySlot = (index, field, value) => {
    const updated = [...formData.availability];
    updated[index][field] = value;
    setFormData({ ...formData, availability: updated });
  };

  const removeAvailabilitySlot = (index) => {
    setFormData({
      ...formData,
      availability: formData.availability.filter((_, i) => i !== index)
    });
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'phone', label: 'Phone' },
    { key: 'experience', label: 'Experience', render: (row) => `${row.experience} years` },
    { key: 'consultationFee', label: 'Fee', render: (row) => `₹${row.consultationFee}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row._id)} className="text-red-600 hover:text-red-800">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
        </div>

        <div className="card">
          <div className="p-6">
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input mb-4 w-full md:w-96"
            />

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <Table columns={columns} data={doctors} />
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Specialization *</label>
              <select
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="input"
              >
                <option value="">Select</option>
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">License Number *</label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Experience (years) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Consultation Fee (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label">Availability Schedule</label>
              <button
                type="button"
                onClick={addAvailabilitySlot}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                Add Slot
              </button>
            </div>
            
            {formData.availability.map((slot, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateAvailabilitySlot(index, 'dayOfWeek', e.target.value)}
                  className="input flex-1"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateAvailabilitySlot(index, 'startTime', e.target.value)}
                  className="input"
                />
                <span>to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateAvailabilitySlot(index, 'endTime', e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => removeAvailabilitySlot(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {editingDoctor ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
