import { useState, useEffect } from 'react';
import { Phone, CheckCircle, ExternalLink, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import { patientService } from '../services';
import { formatDate } from '../utils/helpers';

export default function FollowUps() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('completed');

  useEffect(() => {
    fetchPatients();
  }, [currentPage, statusFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter
      };

      const response = await patientService.getPatients(params);
      setPatients(response.data.patients);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch patients for follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateCall = async (patientId) => {
    try {
      const response = await patientService.initiateFollowUpCall(patientId);
      toast.success(response.message || 'AI Follow-up call initiated');
      // Optionally refresh to see status changes if you track "calling" status on patient
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate call');
    }
  };

  const handleMarkResolved = async (patientId) => {
    try {
      await patientService.updatePatient(patientId, { status: 'active' });
      toast.success('Patient follow-up marked as resolved');
      fetchPatients();
    } catch (error) {
      toast.error('Failed to update patient status');
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
      Low: 'bg-dark-600 text-gray-400 border border-dark-500',
      Medium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      High: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      Urgent: 'bg-red-500/20 text-red-400 border border-red-500/30'
    };
    return colors[priority] || 'bg-dark-600 text-gray-400';
  };

  const columns = [
    {
      key: 'name',
      label: 'Patient',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.name}</span>
          <span className="text-xs text-gray-500">{row.phone}</span>
        </div>
      )
    },
    {
      key: 'lastVisit',
      label: 'Last Visit',
      render: (row) => row.lastVisit ? formatDate(row.lastVisit) : 'N/A'
    },
    {
      key: 'followUpPurpose',
      label: 'Follow-up Purpose',
      render: (row) => row.latestFollowUpDetails?.purpose || 'General Check-up'
    },
    {
      key: 'scheduledDate',
      label: 'Scheduled For',
      render: (row) => row.latestFollowUpDetails?.scheduledDate ? formatDate(row.latestFollowUpDetails.scheduledDate) : 'ASAP'
    },
    {
      key: 'status',
      label: 'Patient Status',
      render: (row) => (
        <span className={`badge ${row.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      )
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
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Initiate Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMarkComplete(row._id)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Mark Complete"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {row.status !== 'completed' && (
            <button
              onClick={() => openEditModal(row)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(row._id)}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Delete"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleMarkResolved(row._id)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Mark as Resolved (Active)"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Follow-up Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Manage post-visit check-ins and AI conversations for recently seen patients.</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === 'completed' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Pending Follow-ups
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === 'active' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              All Active Patients
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-primary-50 to-white border-primary-100">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <Activity className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Ready for Follow-up</p>
                  <p className="text-2xl font-bold text-gray-900">{patients.filter(p => p.status === 'completed').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-md border-none overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : patients.length > 0 ? (
              <>
                <Table columns={columns} data={patients} />
                {totalPages > 1 && (
                  <div className="mt-6 border-t pt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-500">No patients are currently pending follow-up calls.</p>
              </div>
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
                className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-300">Recurring Follow-up</span>
            </label>

            {formData.isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Every</span>
                <input
                  type="number"
                  min="1"
                  value={formData.recurringInterval}
                  onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
                  className="input w-20"
                />
                <span className="text-sm text-gray-400">days</span>
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
