import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Users, Calendar, Phone, Activity, TrendingUp, Clock } from 'lucide-react';
import { appointmentService, callLogService, patientService, followUpService } from '../services';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/helpers';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalCalls: 0,
    successRate: 0,
    pendingFollowUps: 0
  });
  const [callAnalytics, setCallAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appointmentStats, callStats, patientStats, followUpStats] = await Promise.all([
        appointmentService.getStats(),
        callLogService.getAnalytics(),
        patientService.getStats(),
        followUpService.getStats()
      ]);

      setStats({
        totalPatients: patientStats.data.totalPatients || 0,
        totalAppointments: appointmentStats.data.total || 0,
        todayAppointments: appointmentStats.data.todayAppointments || 0,
        totalCalls: callStats.data.totalCalls || 0,
        successRate: callStats.data.successRate || 0,
        pendingFollowUps: followUpStats.data.pending || 0
      });

      setCallAnalytics(callStats.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back! Here's your healthcare AI overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Appointments"
            value={stats.totalAppointments}
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Total Calls"
            value={stats.totalCalls}
            icon={Phone}
            color="purple"
          />
          <StatCard
            title="Call Success Rate"
            value={`${stats.successRate}%`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Pending Follow-ups"
            value={stats.pendingFollowUps}
            icon={Activity}
            color="red"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Status Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Call Status Distribution</h3>
            {callAnalytics?.callsByStatus && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={callAnalytics.callsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry._id}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {callAnalytics.callsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Call Types */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Call Types</h3>
            {callAnalytics?.callsByType && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={callAnalytics.callsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="_id" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sentiment Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Sentiment Analysis</h3>
            {callAnalytics?.sentimentDistribution && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={callAnalytics.sentimentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry._id}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {callAnalytics.sentimentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Calls Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Call Activity</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {callAnalytics?.recentCalls?.map((call) => (
                <div key={call._id} className="flex items-start space-x-3 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <Phone size={16} className="text-primary-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {call.patient?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {call.callType} • {call.status}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDate(call.startTime)}
                    </p>
                  </div>
                  <span className={`badge ${
                    call.status === 'completed' ? 'badge-success' : 
                    call.status === 'failed' ? 'badge-danger' : 
                    'badge-info'
                  }`}>
                    {call.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Performance Metrics */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">AI Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/20">
              <p className="text-sm font-medium text-blue-400">Average Call Duration</p>
              <p className="text-3xl font-bold text-blue-300 mt-2">
                {Math.round(callAnalytics?.averageDuration || 0)}s
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400">Successful Calls</p>
              <p className="text-3xl font-bold text-emerald-300 mt-2">
                {callAnalytics?.successfulCalls || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl border border-purple-500/20">
              <p className="text-sm font-medium text-purple-400">Total Cost</p>
              <p className="text-3xl font-bold text-purple-300 mt-2">
                ${(callAnalytics?.totalCost || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
