import { useState, useEffect } from 'react';
import { Download, Eye, Phone, Brain, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { callLogService, callAnalysisService } from '../services';
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
  const [analyzingCall, setAnalyzingCall] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

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

  const handleAnalyzeAndSchedule = async (callId) => {
    try {
      setAnalyzingCall(callId);
      toast.loading('Analyzing conversation...', { id: 'analyze' });
      
      const response = await callAnalysisService.analyzeAndSchedule(callId);
      
      toast.dismiss('analyze');
      
      // Access the nested data structure: response.data.data
      const result = response.data.data || response.data;
      
      if (result.scheduled) {
        toast.success('Appointment scheduled successfully!');
      } else {
        toast(result.message || 'Analysis complete');
      }
      
      setAnalysisResult(result);
      setShowAnalysisModal(true);
      
      // Refresh call logs
      await fetchCallLogs();
    } catch (error) {
      toast.dismiss('analyze');
      console.error('Analysis error:', error);
      toast.error(error.response?.data?.message || 'Failed to analyze call');
    } finally {
      setAnalyzingCall(null);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      'no-answer': 'bg-yellow-100 text-yellow-800',
      busy: 'bg-orange-100 text-orange-800',
      'in-progress': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSentimentBadge = (sentiment) => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800'
    };
    return colors[sentiment] || 'bg-gray-100 text-gray-800';
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewCallDetails(row)}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.conversation && row.conversation.length > 0 && (
            <button
              onClick={() => handleAnalyzeAndSchedule(row._id)}
              disabled={analyzingCall === row._id}
              className={`${
                analyzingCall === row._id 
                  ? 'text-gray-400' 
                  : 'text-green-600 hover:text-green-800'
              }`}
              title="AI Analyze & Schedule"
            >
              {analyzingCall === row._id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
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
            <div className="mb-4 flex gap-2 flex-wrap">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Status:</label>
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
              <div className="text-center py-8">Loading...</div>
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
                <label className="text-sm text-gray-600">Patient</label>
                <p className="font-medium">{selectedCall.patient?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <p className="font-medium">{selectedCall.patient?.phone || selectedCall.phoneNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Call Type</label>
                <p className="font-medium capitalize">{selectedCall.callType?.replace('-', ' ')}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p>
                  <span className={`badge ${getStatusBadge(selectedCall.status)}`}>
                    {selectedCall.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Duration</label>
                <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Cost</label>
                <p className="font-medium">${(selectedCall.cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Date & Time</label>
                <p className="font-medium">{formatDate(selectedCall.createdAt || selectedCall.startTime)}</p>
              </div>
              {selectedCall.outcome && (
                <div>
                  <label className="text-sm text-gray-600">Outcome</label>
                  <p className="font-medium capitalize">{selectedCall.outcome.replace('-', ' ')}</p>
                </div>
              )}
              {selectedCall.aiMetadata?.intent && (
                <div>
                  <label className="text-sm text-gray-600">Intent</label>
                  <p className="font-medium capitalize">{selectedCall.aiMetadata.intent}</p>
                </div>
              )}
              {selectedCall.aiMetadata?.sentiment && (
                <div>
                  <label className="text-sm text-gray-600">Sentiment</label>
                  <p>
                    <span className={`badge ${getSentimentBadge(selectedCall.aiMetadata.sentiment)}`}>
                      {selectedCall.aiMetadata.sentiment}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Conversation Display */}
            {selectedCall.conversation && selectedCall.conversation.length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Conversation History</label>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto space-y-2">
                  {selectedCall.conversation.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded ${
                        msg.speaker === 'patient' 
                          ? 'bg-blue-100 ml-4' 
                          : msg.speaker === 'ai' 
                          ? 'bg-green-100 mr-4' 
                          : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold uppercase text-gray-700">
                          {msg.speaker === 'patient' ? '👤 Patient' : msg.speaker === 'ai' ? '🤖 AI' : 'System'}
                        </span>
                        {msg.timestamp && (
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript Display (fallback if no conversation array) */}
            {selectedCall.transcript && (!selectedCall.conversation || selectedCall.conversation.length === 0) && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Transcript</label>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                </div>
              </div>
            )}

            {/* Recording Player */}
            {selectedCall.recording && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Call Recording</label>
                <audio controls className="w-full">
                  <source src={selectedCall.recording} type="audio/mpeg" />
                  <source src={selectedCall.recording} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <p className="text-xs text-gray-500 mt-1">
                  <a 
                    href={selectedCall.recording} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open recording in new tab
                  </a>
                </p>
              </div>
            )}

            {selectedCall.errorMessage && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Error Message</label>
                <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                  {selectedCall.errorMessage}
                </div>
              </div>
            )}

            {selectedCall.aiMetadata?.keyPhrases && selectedCall.aiMetadata.keyPhrases.length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Key Phrases</label>
                <div className="flex flex-wrap gap-2">
                  {selectedCall.aiMetadata.keyPhrases.map((phrase, idx) => (
                    <span key={idx} className="badge bg-blue-100 text-blue-800">
                      {phrase}
                    </span>
                  ))}
                </div>

      {/* AI Analysis Result Modal */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => { setShowAnalysisModal(false); setAnalysisResult(null); }}
        title="AI Analysis Results"
        size="lg"
      >
        {analysisResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              analysisResult.scheduled 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {analysisResult.scheduled ? (
                  <>
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Appointment Scheduled</h3>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Analysis Complete</h3>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">{analysisResult.message}</p>
            </div>

            {analysisResult.analysis && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Conversation Analysis</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-xs text-gray-600">Needs Appointment</label>
                    <p className="font-medium">
                      {analysisResult.analysis.needsAppointment ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-600">✗ No</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-xs text-gray-600">Urgency Level</label>
                    <p className="font-medium capitalize">
                      <span className={`badge ${
                        analysisResult.analysis.urgencyLevel === 'emergency' 
                          ? 'bg-red-100 text-red-800'
                          : analysisResult.analysis.urgencyLevel === 'urgent'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {analysisResult.analysis.urgencyLevel}
                      </span>
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-xs text-gray-600">Suggested Specialization</label>
                    <p className="font-medium capitalize">{analysisResult.analysis.suggestedSpecialization}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-xs text-gray-600">Confidence</label>
                    <p className="font-medium">{(analysisResult.analysis.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                {analysisResult.analysis.symptoms && analysisResult.analysis.symptoms.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Detected Symptoms</label>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.analysis.symptoms.map((symptom, idx) => (
                        <span key={idx} className="badge bg-red-100 text-red-800 capitalize">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.analysis.chiefComplaint && (
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Chief Complaint</label>
                    <p className="text-sm bg-gray-50 p-2 rounded capitalize">
                      {analysisResult.analysis.chiefComplaint}
                    </p>
                  </div>
                )}

                {analysisResult.analysis.reasoning && (
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">AI Reasoning</label>
                    <p className="text-sm bg-gray-50 p-3 rounded">
                      {analysisResult.analysis.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {analysisResult.appointment && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Scheduled Appointment Details</h4>
                
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-800">
                    <strong>✓ Appointment Created</strong> - View this appointment in the{' '}
                    <a href="/appointments" className="underline font-medium hover:text-blue-900">
                      Appointments page
                    </a>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Doctor</label>
                    <p className="font-medium">{analysisResult.doctor?.name}</p>
                    <p className="text-xs text-gray-500">{analysisResult.doctor?.specialization}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Date & Time</label>
                    <p className="font-medium">
                      {formatDate(analysisResult.appointment.appointmentDate)}
                    </p>
                    <p className="text-sm text-gray-600">{analysisResult.appointment.appointmentTime}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Type</label>
                    <p className="font-medium capitalize">{analysisResult.appointment.type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Status</label>
                    <p className="font-medium capitalize">
                      <span className="badge bg-green-100 text-green-800">
                        {analysisResult.appointment.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
              </div>
            )}

            {/* Additional metadata */}
            {selectedCall.metadata && Object.keys(selectedCall.metadata).length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Additional Information</label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {Object.entries(selectedCall.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span>{String(value)}</span>
                    </div>
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
