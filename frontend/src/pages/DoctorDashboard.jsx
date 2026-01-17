import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock,
  ArrowLeft,
  Stethoscope,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Award,
  Briefcase,
  IndianRupee,
  Activity,
  TrendingUp,
  FileText
} from 'lucide-react';
import { doctorService, appointmentService, patientService } from '../services';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';

const DoctorDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDoctorData();
  }, [id]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [doctorRes, appointmentsRes, patientsRes] = await Promise.all([
        doctorService.getDoctor(id),
        appointmentService.getAppointments({ doctor: id, limit: 100 }),
        patientService.getPatients({ doctor: id, limit: 100 })
      ]);

      setDoctor(doctorRes.data.doctor);
      setAppointments(appointmentsRes.data.appointments || []);
      setPatients(patientsRes.data.patients || []);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      toast.error('Failed to load doctor data');
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

  const getDayLabel = (day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
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

  if (!doctor) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-200">Doctor not found</h3>
          <button onClick={() => navigate('/doctors')} className="mt-4 btn btn-primary">
            Back to Doctors
          </button>
        </div>
      </Layout>
    );
  }

  // Calculate statistics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const upcomingAppointments = appointments.filter(a => new Date(a.appointmentDate) > new Date() && a.status !== 'cancelled').length;
  const todayAppointments = appointments.filter(a => {
    const today = new Date();
    const aptDate = new Date(a.appointmentDate);
    return aptDate.toDateString() === today.toDateString() && a.status !== 'cancelled';
  }).length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
  const totalPatients = patients.length;
  const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'schedule', name: 'Schedule', icon: Calendar },
    { id: 'appointments', name: 'Appointments', icon: Clock },
    { id: 'patients', name: 'Patients', icon: Users },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/doctors')}
              className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-700 transition-colors border border-dark-700"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Doctor Dashboard</h1>
              <p className="text-gray-400">Profile and performance overview</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
            doctor.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>
            {doctor.status}
          </span>
        </div>

        {/* Doctor Info Card */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-green-600/30">
                {doctor.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">{doctor.name}</h2>
                <p className="text-primary-400 font-medium">{doctor.specialization}</p>
                <div className="flex items-center gap-2 text-gray-400 mt-2">
                  <Phone size={14} />
                  <span>{doctor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 mt-1">
                  <Mail size={14} />
                  <span>{doctor.email}</span>
                </div>
                {doctor.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={i < Math.round(doctor.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} 
                      />
                    ))}
                    <span className="text-gray-400 text-sm ml-1">({doctor.rating})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Briefcase size={16} />
                  <span>Experience</span>
                </div>
                <p className="text-xl font-bold text-gray-100 mt-1">{doctor.experience || 0} yrs</p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Award size={16} />
                  <span>Qualification</span>
                </div>
                <p className="text-lg font-bold text-gray-100 mt-1 truncate" title={doctor.qualification}>
                  {doctor.qualification || 'N/A'}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Stethoscope size={16} />
                  <span>Department</span>
                </div>
                <p className="text-lg font-bold text-gray-100 mt-1 truncate" title={doctor.department}>
                  {doctor.department || 'General'}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <IndianRupee size={16} />
                  <span>Consult Fee</span>
                </div>
                <p className="text-xl font-bold text-green-400 mt-1">₹{doctor.consultationFee || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Today's Patients</p>
                <p className="text-2xl font-bold text-primary-400">{todayAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Calendar className="text-primary-400" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Patients</p>
                <p className="text-2xl font-bold text-blue-400">{totalPatients}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="text-blue-400" size={24} />
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
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-purple-400">{completionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="text-purple-400" size={24} />
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
              {/* Doctor Details */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <FileText className="text-primary-400" size={20} />
                  Professional Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">License Number</p>
                      <p className="text-gray-200 font-medium">{doctor.licenseNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Department</p>
                      <p className="text-gray-200 font-medium">{doctor.department || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Specialization</p>
                      <p className="text-gray-200 font-medium">{doctor.specialization}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Qualification</p>
                      <p className="text-gray-200 font-medium">{doctor.qualification || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <Activity className="text-green-400" size={20} />
                  Performance Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Appointments</span>
                    <span className="text-gray-200 font-semibold">{totalAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-green-400 font-semibold">{completedAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Cancelled</span>
                    <span className="text-red-400 font-semibold">{cancelledAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Completion Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" 
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <span className="text-green-400 font-semibold">{completionRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="card p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="text-primary-400" size={20} />
                  Today's Appointments
                </h3>
                {todayAppointments > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments
                      .filter(a => {
                        const today = new Date();
                        const aptDate = new Date(a.appointmentDate);
                        return aptDate.toDateString() === today.toDateString() && a.status !== 'cancelled';
                      })
                      .map((apt) => (
                        <div key={apt._id} className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-primary-400 font-semibold">{apt.appointmentTime}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-gray-200 font-medium">{apt.patient?.name || 'Unknown Patient'}</p>
                          <p className="text-sm text-gray-400 capitalize">{apt.type?.replace('-', ' ')}</p>
                          {apt.reason && (
                            <p className="text-sm text-gray-500 mt-1 truncate">{apt.reason}</p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
                )}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Weekly Availability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const dayData = doctor.availability?.[day];
                  const isAvailable = dayData?.isAvailable;
                  
                  return (
                    <div 
                      key={day} 
                      className={`rounded-lg p-4 border ${
                        isAvailable 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-dark-800/50 border-dark-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-200">{getDayLabel(day)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          isAvailable 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {isAvailable ? 'Available' : 'Closed'}
                        </span>
                      </div>
                      {isAvailable && dayData?.slots?.length > 0 ? (
                        <div className="space-y-2">
                          {dayData.slots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-gray-300">{slot.startTime} - {slot.endTime}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No slots configured</p>
                      )}
                    </div>
                  );
                })}
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
                        <th className="pb-3">Patient</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {appointments.map((apt) => (
                        <tr key={apt._id} className="text-sm hover:bg-dark-800/30">
                          <td className="py-3 text-gray-200">{formatDate(apt.appointmentDate)}</td>
                          <td className="py-3 text-gray-300">{apt.appointmentTime}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                                {apt.patient?.name?.charAt(0) || '?'}
                              </div>
                              <span className="text-gray-200">{apt.patient?.name || 'Unknown'}</span>
                            </div>
                          </td>
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
                <p className="text-gray-500 text-center py-8">No appointments found</p>
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Assigned Patients ({totalPatients})</h3>
              {patients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.map((patient) => (
                    <div 
                      key={patient._id} 
                      className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 hover:border-primary-500/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patient/${patient._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {patient.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-200 truncate">{patient.name}</p>
                          <p className="text-sm text-gray-400">{patient.phone}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          patient.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {patient.status}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-dark-700/50 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Age:</span>
                          <span className="text-gray-300 ml-1">{patient.age || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gender:</span>
                          <span className="text-gray-300 ml-1 capitalize">{patient.gender || 'N/A'}</span>
                        </div>
                        {patient.medicalHistory?.conditions?.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Conditions:</span>
                            <span className="text-gray-300 ml-1">{patient.medicalHistory.conditions.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No patients assigned</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DoctorDashboard;
