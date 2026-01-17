import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Heart, 
  Pill, 
  AlertTriangle,
  Activity,
  Clock,
  ArrowLeft,
  FileText,
  Stethoscope,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Droplet
} from 'lucide-react';
import { patientService, appointmentService, callLogService, followUpService } from '../services';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';

const PatientDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const [patientRes, appointmentsRes, callsRes, followUpsRes] = await Promise.all([
        patientService.getPatient(id),
        appointmentService.getAppointments({ patient: id, limit: 100 }),
        callLogService.getCallLogs({ patient: id, limit: 100 }),
        followUpService.getFollowUps({ patient: id, limit: 100 })
      ]);

      setPatient(patientRes.data.patient);
      setAppointments(appointmentsRes.data.appointments || []);
      setCallLogs(callsRes.data.callLogs || []);
      setFollowUps(followUpsRes.data.followUps || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      scheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      'no-show': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      rescheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getCallStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      answered: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      'no-answer': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      busy: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      voicemail: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-200">Patient not found</h3>
          <button onClick={() => navigate('/patients')} className="mt-4 btn btn-primary">
            Back to Patients
          </button>
        </div>
      </Layout>
    );
  }

  // Calculate statistics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const upcomingAppointments = appointments.filter(a => new Date(a.appointmentDate) > new Date() && a.status !== 'cancelled').length;
  const totalCalls = callLogs.length;
  const successfulCalls = callLogs.filter(c => c.status === 'completed' || c.status === 'answered').length;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'calls', name: 'Call History', icon: Phone },
    { id: 'followups', name: 'Follow-ups', icon: Activity },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/patients')}
              className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-700 transition-colors border border-dark-700"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Patient Dashboard</h1>
              <p className="text-gray-400">Complete medical records and history</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
            patient.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>
            {patient.status}
          </span>
        </div>

        {/* Patient Info Card */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-600/30">
                {patient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">{patient.name}</h2>
                <div className="flex items-center gap-2 text-gray-400 mt-1">
                  <Phone size={14} />
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2 text-gray-400 mt-1">
                    <Mail size={14} />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address?.city && (
                  <div className="flex items-center gap-2 text-gray-400 mt-1">
                    <MapPin size={14} />
                    <span>{patient.address.city}, {patient.address.state}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Calendar size={16} />
                  <span>Age</span>
                </div>
                <p className="text-xl font-bold text-gray-100 mt-1">{patient.age || 'N/A'}</p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <User size={16} />
                  <span>Gender</span>
                </div>
                <p className="text-xl font-bold text-gray-100 mt-1 capitalize">{patient.gender || 'N/A'}</p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Droplet size={16} />
                  <span>Blood Group</span>
                </div>
                <p className="text-xl font-bold text-red-400 mt-1">{patient.medicalHistory?.bloodGroup || 'N/A'}</p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Activity size={16} />
                  <span>Language</span>
                </div>
                <p className="text-xl font-bold text-gray-100 mt-1 capitalize">{patient.language || 'English'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Visits</p>
                <p className="text-2xl font-bold text-gray-100">{totalAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="text-blue-400" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-400">{completedAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-400">{upcomingAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Call Success</p>
                <p className="text-2xl font-bold text-purple-400">{totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Phone className="text-purple-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-dark-700/50">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Medical History */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <Heart className="text-red-400" size={20} />
                  Medical History
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.medicalHistory?.conditions?.length > 0 ? (
                        patient.medicalHistory.conditions.map((condition, i) => (
                          <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-500/30">
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No conditions recorded</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.medicalHistory?.allergies?.length > 0 ? (
                        patient.medicalHistory.allergies.map((allergy, i) => (
                          <span key={i} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm border border-orange-500/30 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No allergies recorded</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Current Medications</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.medicalHistory?.medications?.length > 0 ? (
                        patient.medicalHistory.medications.map((med, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30 flex items-center gap-1">
                            <Pill size={12} />
                            {med}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No medications recorded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Doctor */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <Stethoscope className="text-primary-400" size={20} />
                  Primary Care Doctor
                </h3>
                {patient.assignedDoctor ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl font-bold">
                      {patient.assignedDoctor.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-100">{patient.assignedDoctor.name}</p>
                      <p className="text-sm text-gray-400">{patient.assignedDoctor.specialization}</p>
                      {patient.assignedDoctor.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Phone size={12} /> {patient.assignedDoctor.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No doctor assigned</p>
                )}

                {/* Emergency Contact */}
                <div className="mt-6 pt-6 border-t border-dark-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Emergency Contact</h4>
                  {patient.emergencyContact?.name ? (
                    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                      <p className="font-medium text-gray-200">{patient.emergencyContact.name}</p>
                      <p className="text-sm text-gray-400">{patient.emergencyContact.relationship}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone size={12} /> {patient.emergencyContact.phone}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No emergency contact recorded</p>
                  )}
                </div>
              </div>

              {/* Recent Appointments */}
              <div className="card p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="text-primary-400" size={20} />
                  Recent Appointments
                </h3>
                {appointments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-400 border-b border-dark-700/50">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Doctor</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Reason</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700/50">
                        {appointments.slice(0, 5).map((apt) => (
                          <tr key={apt._id} className="text-sm">
                            <td className="py-3 text-gray-200">{formatDate(apt.appointmentDate)}</td>
                            <td className="py-3 text-gray-300">{apt.appointmentTime}</td>
                            <td className="py-3 text-gray-300">{apt.doctor?.name || 'N/A'}</td>
                            <td className="py-3 text-gray-400 capitalize">{apt.type?.replace('-', ' ')}</td>
                            <td className="py-3 text-gray-400 max-w-xs truncate">{apt.reason || 'N/A'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                                {apt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No appointments found</p>
                )}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">All Appointments</h3>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-dark-700/50">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Time</th>
                        <th className="pb-3">Doctor</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Symptoms</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {appointments.map((apt) => (
                        <tr key={apt._id} className="text-sm hover:bg-dark-800/30">
                          <td className="py-3 text-gray-200">{formatDate(apt.appointmentDate)}</td>
                          <td className="py-3 text-gray-300">{apt.appointmentTime}</td>
                          <td className="py-3 text-gray-300">{apt.doctor?.name || 'N/A'}</td>
                          <td className="py-3 text-gray-400 capitalize">{apt.type?.replace('-', ' ')}</td>
                          <td className="py-3 text-gray-400 max-w-xs truncate">{apt.reason || 'N/A'}</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {apt.symptoms?.slice(0, 2).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-dark-700 text-gray-300 rounded text-xs">{s}</span>
                              ))}
                              {apt.symptoms?.length > 2 && (
                                <span className="text-xs text-gray-500">+{apt.symptoms.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500 max-w-xs truncate">{apt.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No appointments found</p>
              )}
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === 'calls' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Call History</h3>
              {callLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-dark-700/50">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Duration</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Outcome</th>
                        <th className="pb-3">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {callLogs.map((call) => (
                        <tr key={call._id} className="text-sm hover:bg-dark-800/30">
                          <td className="py-3 text-gray-200">{formatDate(call.startTime)}</td>
                          <td className="py-3 text-gray-400 capitalize">{call.callType?.replace('-', ' ')}</td>
                          <td className="py-3 text-gray-300">{call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCallStatusColor(call.status)}`}>
                              {call.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 capitalize">{call.outcome?.replace('-', ' ') || 'N/A'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              call.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                              call.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {call.sentiment || 'neutral'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No call logs found</p>
              )}
            </div>
          )}

          {/* Follow-ups Tab */}
          {activeTab === 'followups' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Follow-up Records</h3>
              {followUps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-dark-700/50">
                        <th className="pb-3">Scheduled Date</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Purpose</th>
                        <th className="pb-3">Doctor</th>
                        <th className="pb-3">Priority</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {followUps.map((fu) => (
                        <tr key={fu._id} className="text-sm hover:bg-dark-800/30">
                          <td className="py-3 text-gray-200">{formatDate(fu.scheduledDate)}</td>
                          <td className="py-3 text-gray-400 capitalize">{fu.type?.replace('-', ' ')}</td>
                          <td className="py-3 text-gray-300 max-w-xs truncate">{fu.purpose}</td>
                          <td className="py-3 text-gray-300">{fu.doctor?.name || 'N/A'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              fu.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              fu.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              fu.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-green-500/20 text-green-400 border-green-500/30'
                            }`}>
                              {fu.priority}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(fu.status)}`}>
                              {fu.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No follow-ups found</p>
              )}
            </div>
          )}
        </div>

        {/* Notes Section */}
        {patient.notes && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <FileText className="text-primary-400" size={20} />
              Notes
            </h3>
            <p className="text-gray-300 whitespace-pre-wrap">{patient.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientDashboard;
