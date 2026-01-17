import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { patientService } from '../services';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    language: 'english'
  });

  useEffect(() => {
    fetchPatients();
  }, [currentPage, search]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatients({ page: currentPage, search, limit: 10 });
      setPatients(response.data?.patients || []);
      setTotalPages(response.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', age: '', gender: '', language: 'english' });
    setEditingPatient(null);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      age: patient.age || '',
      gender: patient.gender || '',
      language: patient.language || 'english'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPatient) {
        await patientService.updatePatient(editingPatient._id, formData);
        toast.success('Patient updated successfully');
      } else {
        await patientService.createPatient(formData);
        toast.success('Patient created successfully');
      }
      setIsModalOpen(false);
      resetForm();
      fetchPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error(error.response?.data?.message || `Failed to ${editingPatient ? 'update' : 'create'} patient`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      await patientService.deletePatient(id);
      toast.success('Patient deleted successfully');
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient');
    }
  };

  const columns = [
    {
      label: 'Name',
      key: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
        </div>
      )
    },
    { label: 'Phone', key: 'phone' },
    { label: 'Age', key: 'age' },
    { label: 'Gender', key: 'gender', render: (row) => row.gender?.charAt(0).toUpperCase() + row.gender?.slice(1) },
    { label: 'Language', key: 'language', render: (row) => row.language?.toUpperCase() },
    {
      label: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`badge ${getStatusColor(row.status)}`}>{row.status}</span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit patient"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete patient"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="btn btn-primary"
          >
            <Plus size={20} className="mr-2" />
            Add Patient
          </button>
        </div>

        <div className="card">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search patients..."
                className="input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No patients found</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={patients} />
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingPatient ? 'Edit Patient' : 'Add New Patient'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name * <span className="text-xs text-gray-500">(Full name)</span>
            </label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone * <span className="text-xs text-gray-500">(E.164 format: +919876543210)</span>
            </label>
            <input
              type="tel"
              required
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+919876543210"
              pattern="^\+[1-9]\d{1,14}$"
              title="Phone must be in E.164 format (e.g., +919876543210)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +[country code][number] (e.g., +919876543210 for India, +15551234567 for US)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                className="input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                min="0"
                max="150"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                className="input"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              className="input"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="bengali">Bengali</option>
              <option value="tamil">Tamil</option>
              <option value="telugu">Telugu</option>
              <option value="marathi">Marathi</option>
              <option value="gujarati">Gujarati</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingPatient ? 'Update Patient' : 'Create Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Patients;
