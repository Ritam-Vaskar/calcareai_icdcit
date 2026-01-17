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
          <button
            onClick={() => handleInitiateCall(row._id)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Initiate AI Follow-up Call"
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
    </Layout>
  );
}
