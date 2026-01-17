import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  Loader2,
  UserX
} from 'lucide-react';
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
  // State
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // New state for API call
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

  // Debounce Search Logic: Only update search term after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Data
  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorService.getDoctors({
        page: currentPage,
        limit: 10,
        search: debouncedSearch
      });
      // Ensure we safely access the data structure
      setDoctors(response?.data?.doctors || []);
      setTotalPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Basic validation
      if (formData.availability.length === 0) {
        toast.error('Please add at least one availability slot');
        return;
      }

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
    if (!window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) return;
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
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      licenseNumber: doctor.licenseNumber || '',
      experience: doctor.experience || '',
      consultationFee: doctor.consultationFee || '',
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

  // Availability Handlers
  const addAvailabilitySlot = () => {
    setFormData(prev => ({
      ...prev,
      availability: [
        ...(Array.isArray(prev.availability) ? prev.availability : []),
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }
      ]
    }));
  };

  const updateAvailabilitySlot = (index, field, value) => {
    if (!Array.isArray(formData.availability)) return;
    const updated = [...formData.availability];
    updated[index][field] = value;
    setFormData({ ...formData, availability: updated });
  };

  const removeAvailabilitySlot = (index) => {
    if (!Array.isArray(formData.availability)) return;
    const updated = formData.availability.filter((_, i) => i !== index);
    setFormData({ ...formData, availability: updated });
  };

  const columns = [
    {
      key: 'name',
      label: 'Doctor Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      )
    },
    {
      key: 'specialization',
      label: 'Specialization',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {row.specialization}
        </span>
      )
    },
    { key: 'phone', label: 'Phone' },
    { key: 'experience', label: 'Experience', render: (row) => `${row.experience} Yrs` },
    { key: 'consultationFee', label: 'Fee', render: (row) => `₹${row.consultationFee}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-3">
          <button
            onClick={() => openEditModal(row)}
            className="text-indigo-600 hover:text-indigo-900 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctors Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage doctor profiles, schedules, and details.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p>Loading doctors...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                  <UserX className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No doctors found</h3>
                <p className="text-sm">Try adjusting your search or add a new doctor.</p>
              </div>
            ) : (
              <>
                <Table columns={columns} data={doctors} />
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDoctor ? 'Edit Doctor Details' : 'Add New Doctor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Dr. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Specialization *</label>
              <select
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="">Select Specialization</option>
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">License Number *</label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Experience (Yrs) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Fee (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-900">Availability Schedule</label>
              <button
                type="button"
                onClick={addAvailabilitySlot}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Add Slot
              </button>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {formData.availability.length === 0 && (
                <p className="text-sm text-gray-400 text-center italic">No availability slots added yet.</p>
              )}


              {Array.isArray(formData.availability) && formData.availability.map((slot, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2 rounded border border-gray-200 shadow-sm">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateAvailabilitySlot(index, 'dayOfWeek', e.target.value)}
                    className="w-full sm:w-1/3 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    {WEEKDAYS.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateAvailabilitySlot(index, 'startTime', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateAvailabilitySlot(index, 'endTime', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAvailabilitySlot(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors self-end sm:self-center"
                    title="Remove slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              {editingDoctor ? 'Update Doctor' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}