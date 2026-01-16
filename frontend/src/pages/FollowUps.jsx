import { useState, useEffect } from 'react';
import { Plus, Phone, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { followUpService, patientService } from '../services';
import { formatDate, getStatusColor } from '../utils/helpers';

const FOLLOW_UP_TYPES = [
  'Post-Visit',
  'Medication Reminder',
  'Lab Result',
  'Chronic Care',
  'Wellness Check',
  'Recovery Check'
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    patient: '',
    type: 'Post-Visit',
    priority: 'Medium',
    scheduledDate: '',
    reason: '',
    notes: '',
    isRecurring: false,
    recurringInterval: 7
  });

  useEffect(() => {
    fetchFollowUps();
    fetchPatients();
  }, [currentPage, statusFilter]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10
      };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await followUpService.getFollowUps(params);
      setFollowUps(response.data.followUps);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientService.getPatients({ limit: 100 });
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Failed to fetch patients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFollowUp) {
        await followUpService.updateFollowUp(editingFollowUp._id, formData);
        toast.success('Follow-up updated successfully');
      } else {
        await followUpService.createFollowUp(formData);
        toast.success('Follow-up created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchFollowUps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleInitiateCall = async (followUpId) => {
    try {
      const response = await followUpService.initiateCall(followUpId);
      toast.success(response.data.message || 'Call initiated successfully');
      fetchFollowUps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate call');
    }
  };

  const handleMarkComplete = async (followUpId) => {
    try {
      await followUpService.completeFollowUp(followUpId);
      toast.success('Follow-up marked as completed');
      fetchFollowUps();
    } catch (error) {
      toast.error('Failed to complete follow-up');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      await followUpService.deleteFollowUp(id);
      toast.success('Follow-up deleted successfully');
      fetchFollowUps();
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  const openEditModal = (followUp) => {
    setEditingFollowUp(followUp);
    const date = new Date(followUp.scheduledDate);
    setFormData({
      patient: followUp.patient._id,
      type: followUp.type,
      priority: followUp.priority,
      scheduledDate: date.toISOString().split('T')[0],
      reason: followUp.reason || '',
      notes: followUp.notes || '',
      isRecurring: followUp.isRecurring || false,
      recurringInterval: followUp.recurringInterval || 7
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      patient: '',
      type: 'Post-Visit',
      priority: 'Medium',
      scheduledDate: '',
      reason: '',
      notes: '',
      isRecurring: false,
      recurringInterval: 7
    });
    setEditingFollowUp(null);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-gray-100 text-gray-800',
      Medium: 'bg-blue-100 text-blue-800',
      High: 'bg-orange-100 text-orange-800',
      Urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'patient',
      label: 'Patient',
      render: (row) => row.patient?.name || 'N/A'
    },
    { key: 'type', label: 'Type' },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={`badge ${getPriorityColor(row.priority)}`}>
          {row.priority}
        </span>
      )
    },
    {
      key: 'scheduledDate',
      label: 'Scheduled Date',
      render: (row) => formatDate(row.scheduledDate)
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`badge ${getStatusColor(row.status)}`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'isRecurring',
      label: 'Recurring',
      render: (row) => row.isRecurring ? `Every ${row.recurringInterval} days` : 'No'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleInitiateCall(row._id)}
                className="text-green-600 hover:text-green-800"
                title="Initiate Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMarkComplete(row._id)}
                className="text-blue-600 hover:text-blue-800"
                title="Mark Complete"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {row.status !== 'completed' && (
            <button
              onClick={() => openEditModal(row)}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(row._id)}
            className="text-red-600 hover:text-red-800"
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Follow-up
          </button>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="mb-4 flex gap-2">
              {['all', 'pending', 'in-progress', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <Table columns={columns} data={followUps} />
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
        title={editingFollowUp ? 'Edit Follow-up' : 'New Follow-up'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Patient *</label>
              <select
                required
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                className="input"
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} - {patient.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                {FOLLOW_UP_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Priority *</label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Scheduled Date *</label>
              <input
                type="date"
                required
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input"
              placeholder="E.g., Post-surgery checkup"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Recurring Follow-up</span>
            </label>

            {formData.isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Every</span>
                <input
                  type="number"
                  min="1"
                  value={formData.recurringInterval}
                  onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
                  className="input w-20"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {editingFollowUp ? 'Update' : 'Create'}
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
