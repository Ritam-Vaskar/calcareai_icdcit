import { useState, useEffect } from 'react';
import { Plus, Phone, Calendar, X, Edit2, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { appointmentService, patientService, doctorService } from '../services';
import { formatDate, getStatusColor } from '../utils/helpers';

const APPOINTMENT_TYPES = ['Consultation', 'Follow-up', 'Emergency', 'Routine Checkup'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [completingAppointment, setCompletingAppointment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    patient: '',
    doctor: '',
    appointmentDate: '',
    appointmentTime: '',
    type: 'Consultation',
    reason: '',
    notes: ''
  });

  const [completeData, setCompleteData] = useState({
    report: '',
    notes: '',
    followUpRequired: true,
    followUpDate: '',
    followUpPurpose: 'Post-visit check-up'
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [currentPage, statusFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10
      };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await appointmentService.getAppointments(params);

      if (response && response.data) {
        setAppointments(response.data.appointments || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientService.getPatients({ limit: 100 });
      setPatients(response.data?.patients || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      setPatients([]);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await doctorService.getDoctors({ limit: 100 });
      setDoctors(response.data?.doctors || []);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      setDoctors([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        await appointmentService.updateAppointment(editingAppointment._id, formData);
        toast.success('Appointment updated successfully');
      } else {
        await appointmentService.createAppointment(formData);
        toast.success('Appointment created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      await appointmentService.completeAppointment(completingAppointment._id, completeData);
      toast.success('Appointment completed and follow-up scheduled');
      setShowCompleteModal(false);
      setCompletingAppointment(null);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete appointment');
    }
  };

  const handleInitiateCall = async (appointmentId) => {
    try {
      const response = await appointmentService.initiateCall(appointmentId);
      toast.success(response.data.message || 'Call initiated successfully');
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate call');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentService.cancelAppointment(appointmentId);
      toast.success('Appointment cancelled successfully');
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    const date = new Date(appointment.appointmentDate);
    setFormData({
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      appointmentDate: date.toISOString().split('T')[0],
      appointmentTime: appointment.appointmentTime,
      type: appointment.type,
      reason: appointment.reason || '',
      notes: appointment.notes || ''
    });
    setShowModal(true);
  };

  const openCompleteModal = (appointment) => {
    setCompletingAppointment(appointment);
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    setCompleteData({
      report: '',
      notes: '',
      followUpRequired: true,
      followUpDate: twoDaysLater.toISOString().split('T')[0],
      followUpPurpose: 'Post-visit check-up'
    });
    setShowCompleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      patient: '',
      doctor: '',
      appointmentDate: '',
      appointmentTime: '',
      type: 'Consultation',
      reason: '',
      notes: ''
    });
    setEditingAppointment(null);
  };

  const columns = [
    {
      key: 'patient',
      label: 'Patient',
      render: (row) => (
        <div>
          <div className="font-medium">{row.patient?.name || 'N/A'}</div>
          {row.metadata?.aiScheduled === 'true' && (
            <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              AI Scheduled
            </span>
          )}
        </div>
      )
    },
    {
      key: 'doctor',
      label: 'Doctor',
      render: (row) => `Dr. ${row.doctor?.name || 'N/A'}`
    },
    {
      key: 'appointmentDate',
      label: 'Date & Time',
      render: (row) => `${formatDate(row.appointmentDate)} ${row.appointmentTime}`
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (row) => (
        <span className="capitalize">{row.type?.replace('-', ' ')}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const statusColors = {
          scheduled: 'bg-blue-100 text-blue-800',
          confirmed: 'bg-green-100 text-green-800',
          rescheduled: 'bg-yellow-100 text-yellow-800',
          cancelled: 'bg-red-100 text-red-800',
          completed: 'bg-emerald-100 text-emerald-800',
          'no-show': 'bg-red-100 text-red-800',
          'no-response': 'bg-gray-100 text-gray-800'
        };
        const colorClass = statusColors[row.status] || 'bg-gray-100 text-gray-800';
        const displayStatus = row.status ? row.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown';
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {displayStatus}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {(row.status === 'scheduled' || row.status === 'confirmed' || row.status === 'rescheduled') && (
            <>
              <button
                onClick={() => handleInitiateCall(row._id)}
                className="text-green-600 hover:text-green-800"
                title="Initiate Confirmation Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => openCompleteModal(row)}
                className="text-primary-600 hover:text-primary-800"
                title="Complete Appointment"
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <button
                onClick={() => openEditModal(row)}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleCancelAppointment(row._id)}
                className="text-red-600 hover:text-red-800"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="mb-4 flex gap-2 flex-wrap">
              {['all', 'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no-show', 'no-response'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status === 'all' ? 'All' : status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <Table columns={columns} data={appointments} />
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingAppointment ? 'Edit Appointment' : 'New Appointment'}
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
              <label className="label">Doctor *</label>
              <select
                required
                value={formData.doctor}
                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                className="input"
              >
                <option value="">Select Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor._id} value={doctor._id}>
                    Dr. {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Time *</label>
              <input
                type="time"
                required
                value={formData.appointmentTime}
                onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                {APPOINTMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Reason</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="input"
                placeholder="E.g., Routine checkup"
              />
            </div>
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

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {editingAppointment ? 'Update' : 'Create'}
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

      {/* Complete Appointment Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Appointment & Schedule Follow-up"
        size="lg"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <div>
            <label className="label">Doctor's Report / Clinical Summary *</label>
            <textarea
              required
              value={completeData.report}
              onChange={(e) => setCompleteData({ ...completeData, report: e.target.value })}
              className="input"
              rows="4"
              placeholder="Enter findings, diagnosis, and treatment plan. This will be used by the AI for follow-up calls."
            />
          </div>

          <div>
            <label className="label">Internal Notes</label>
            <textarea
              value={completeData.notes}
              onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
              className="input"
              rows="2"
              placeholder="Any additional internal notes..."
            />
          </div>

          <div className="card p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={completeData.followUpRequired}
                onChange={(e) => setCompleteData({ ...completeData, followUpRequired: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="followUpRequired" className="text-sm font-semibold text-gray-900">
                Schedule AI Follow-up Call
              </label>
            </div>

            {completeData.followUpRequired && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Follow-up Date</label>
                  <input
                    type="date"
                    required
                    value={completeData.followUpDate}
                    onChange={(e) => setCompleteData({ ...completeData, followUpDate: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Purpose of Call</label>
                  <input
                    type="text"
                    required
                    value={completeData.followUpPurpose}
                    onChange={(e) => setCompleteData({ ...completeData, followUpPurpose: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              Complete & Schedule Follow-up
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
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
