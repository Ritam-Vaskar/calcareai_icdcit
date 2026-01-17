import { useState, useEffect } from 'react';
import { Download, Eye, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { callLogService } from '../services';
import { formatDate, formatDuration } from '../utils/helpers';

export default function CallLogs() {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchCallLogs();
  }, [currentPage, statusFilter, typeFilter]);

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.callType = typeFilter;

      const response = await callLogService.getCallLogs(params);
      setCallLogs(response.data.callLogs);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch call logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await callLogService.exportCallLogs();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Call logs exported successfully');
    } catch (error) {
      toast.error('Failed to export call logs');
    }
  };

  const viewCallDetails = (call) => {
    setSelectedCall(call);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
      'no-answer': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      busy: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    };
    return colors[status] || 'bg-dark-600 text-gray-400';
  };

  const getSentimentBadge = (sentiment) => {
    const colors = {
      positive: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      negative: 'bg-red-500/20 text-red-400 border border-red-500/30',
      neutral: 'bg-dark-600 text-gray-400 border border-dark-500'
    };
    return colors[sentiment] || 'bg-dark-600 text-gray-400';
  };

  const columns = [
    {
      key: 'patient',
      label: 'Patient',
      render: (row) => row.patient?.name || 'N/A'
    },
    {
      key: 'phoneNumber',
      label: 'Phone',
      render: (row) => row.patient?.phone || row.phoneNumber
    },
    {
      key: 'callType',
      label: 'Type',
      render: (row) => (
        <span className="capitalize">{row.callType?.replace('-', ' ')}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`badge ${getStatusBadge(row.status)}`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (row) => formatDuration(row.duration)
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      render: (row) => row.aiMetadata?.sentiment ? (
        <span className={`badge ${getSentimentBadge(row.aiMetadata.sentiment)}`}>
          {row.aiMetadata.sentiment}
        </span>
      ) : '-'
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (row) => `$${(row.cost || 0).toFixed(2)}`
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (row) => formatDate(row.createdAt)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          onClick={() => viewCallDetails(row)}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-100">Call Logs</h1>
          <button
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="mb-4 flex gap-4 flex-wrap">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Type:</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input"
                >
                  <option value="all">All Types</option>
                  <option value="appointment-confirmation">Appointment Confirmation</option>
                  <option value="appointment-reminder">Appointment Reminder</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="rescheduling">Rescheduling</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : (
              <>
                <Table columns={columns} data={callLogs} />
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
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCall(null); }}
        title="Call Details"
        size="lg"
      >
        {selectedCall && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Patient</label>
                <p className="font-medium text-gray-200">{selectedCall.patient?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="font-medium text-gray-200">{selectedCall.patient?.phone || selectedCall.phoneNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Call Type</label>
                <p className="font-medium text-gray-200 capitalize">{selectedCall.callType?.replace('-', ' ')}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p>
                  <span className={`badge ${getStatusBadge(selectedCall.status)}`}>
                    {selectedCall.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Duration</label>
                <p className="font-medium text-gray-200">{formatDuration(selectedCall.duration)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Cost</label>
                <p className="font-medium text-gray-200">${(selectedCall.cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date & Time</label>
                <p className="font-medium text-gray-200">{formatDate(selectedCall.createdAt)}</p>
              </div>
              {selectedCall.aiMetadata?.intent && (
                <div>
                  <label className="text-sm text-gray-500">Intent</label>
                  <p className="font-medium text-gray-200 capitalize">{selectedCall.aiMetadata.intent}</p>
                </div>
              )}
              {selectedCall.aiMetadata?.sentiment && (
                <div>
                  <label className="text-sm text-gray-500">Sentiment</label>
                  <p>
                    <span className={`badge ${getSentimentBadge(selectedCall.aiMetadata.sentiment)}`}>
                      {selectedCall.aiMetadata.sentiment}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {selectedCall.transcript && (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Transcript</label>
                <div className="bg-dark-700/50 p-4 rounded-lg max-h-64 overflow-y-auto border border-dark-600">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedCall.transcript}</p>
                </div>
              </div>
            )}

            {selectedCall.recording && (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Recording</label>
                <audio controls className="w-full">
                  <source src={selectedCall.recording} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {selectedCall.errorMessage && (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Error Message</label>
                <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/30">
                  {selectedCall.errorMessage}
                </div>
              </div>
            )}

            {selectedCall.aiMetadata?.keyPhrases && selectedCall.aiMetadata.keyPhrases.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Key Phrases</label>
                <div className="flex flex-wrap gap-2">
                  {selectedCall.aiMetadata.keyPhrases.map((phrase, idx) => (
                    <span key={idx} className="badge badge-info">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
