import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { syncSubmissionToTeable } from '../lib/teableSync';
import { Database, ArrowLeft, Eye, Trash2, CheckCircle, XCircle, Clock, RefreshCw, List, Table, Map } from 'lucide-react';
import { ProjectTableView } from './ProjectTableView';
import { ProjectMapView } from './ProjectMapView';
import type { Database as DB } from '../lib/database.types';

type SubmissionRow = DB['public']['Tables']['submissions']['Row'];
type ProjectRow = DB['public']['Tables']['projects']['Row'];
type UserRow = DB['public']['Tables']['users']['Row'];

interface SubmissionWithUser extends SubmissionRow {
  users: UserRow | null;
}

export function ProjectSubmissions() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null);
  const [retryingSync, setRetryingSync] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'table' | 'map'>('list');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .maybeSingle();

      if (projectError) throw projectError;
      setProject(project);

      const { data: forms, error: formsError } = await supabase
        .from('forms')
        .select('id')
        .eq('project_id', projectId!);

      if (formsError) throw formsError;

      const formIds = forms.map(f => f.id);

      if (formIds.length > 0) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            users (*)
          `)
          .in('form_id', formIds)
          .order('created_at', { ascending: false });

        if (!submissionsError) {
          setSubmissions(submissions as SubmissionWithUser[] || []);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting submission:', err);
      alert('Failed to delete submission');
    }
  };

  const updateStatus = async (submissionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status })
        .eq('id', submissionId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handleRetrySync = async (submissionId: string) => {
    setRetryingSync(submissionId);
    try {
      const result = await syncSubmissionToTeable(submissionId);
      if (result.success) {
        alert('Sync successful!');
        loadData();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Error retrying sync:', err);
      alert('Failed to retry sync');
    } finally {
      setRetryingSync(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/projects"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{project?.name}</h1>
                  <p className="text-sm text-gray-600">Submissions</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {submissions.length} total submissions
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'table'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Table className="w-4 h-4" />
                Table View
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'map'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Map className="w-4 h-4" />
                Map View
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'list' && (
          submissions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-600">Start collecting data to see submissions here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(submission.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.users?.username || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={submission.status}
                          onChange={(e) => updateStatus(submission.id, e.target.value)}
                          disabled={!isAdmin}
                          className="text-xs px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500"
                          style={{
                            backgroundColor:
                              submission.status === 'approved'
                                ? '#DEF7EC'
                                : submission.status === 'rejected'
                                ? '#FDE8E8'
                                : submission.status === 'in_review'
                                ? '#FEF3C7'
                                : '#F3F4F6',
                            color:
                              submission.status === 'approved'
                                ? '#03543F'
                                : submission.status === 'rejected'
                                ? '#9B1C1C'
                                : submission.status === 'in_review'
                                ? '#92400E'
                                : '#1F2937',
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_review">In Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {submission.synced_to_teable ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="w-4 h-4" />
                              Synced
                            </span>
                          ) : submission.sync_error ? (
                            <>
                              <span className="flex items-center gap-1 text-red-600 text-xs" title={submission.sync_error}>
                                <XCircle className="w-4 h-4" />
                                Failed
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleRetrySync(submission.id)}
                                  disabled={retryingSync === submission.id}
                                  className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded disabled:opacity-50"
                                  title="Retry sync"
                                >
                                  <RefreshCw className={`w-3 h-3 ${retryingSync === submission.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-600 text-xs">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSubmission(submission.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
            <ProjectTableView />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-4" style={{ height: '600px' }}>
            <ProjectMapView />
          </div>
        )}
      </main>

      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}

interface SubmissionDetailModalProps {
  submission: SubmissionWithUser;
  onClose: () => void;
}

function SubmissionDetailModal({ submission, onClose }: SubmissionDetailModalProps) {
  const data = submission.data as Record<string, any>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Submission Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Submitted By</p>
                <p className="font-medium text-gray-900">{submission.users?.username || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Submitted At</p>
                <p className="font-medium text-gray-900">
                  {new Date(submission.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium text-gray-900 capitalize">{submission.status}</p>
              </div>
              <div>
                <p className="text-gray-600">Teable Sync</p>
                <p className="font-medium text-gray-900">
                  {submission.synced_to_teable ? 'Synced' : 'Not Synced'}
                </p>
              </div>
            </div>
            {submission.sync_error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">Sync Error:</p>
                <p className="text-sm text-red-700">{submission.sync_error}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Data</h3>
            <div className="space-y-3">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">{key}</p>
                  {typeof value === 'object' && value !== null ? (
                    value.latitude !== undefined ? (
                      <div className="text-sm text-gray-900">
                        <p>Lat: {value.latitude}, Lng: {value.longitude}</p>
                        {value.accuracy && <p className="text-xs text-gray-600">±{value.accuracy}m</p>}
                      </div>
                    ) : (
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    )
                  ) : typeof value === 'string' && value.startsWith('data:image') ? (
                    <img src={value} alt={key} className="max-w-full h-auto rounded-lg mt-2" />
                  ) : typeof value === 'string' && value.startsWith('data:audio') ? (
                    <audio src={value} controls className="w-full mt-2" />
                  ) : typeof value === 'string' && value.startsWith('data:video') ? (
                    <video src={value} controls className="w-full rounded-lg mt-2" />
                  ) : (
                    <p className="text-sm text-gray-900">{String(value)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
