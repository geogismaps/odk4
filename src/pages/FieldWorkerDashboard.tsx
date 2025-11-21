import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Download, Trash2, LogOut, Smartphone, CloudOff, RefreshCw } from 'lucide-react';
import { saveFormOffline, getAllOfflineForms, deleteOfflineForm, getPendingSubmissions } from '../lib/offlineStorage';
import { parseXForm } from '../lib/xmlParser';
import { OnlineStatus } from '../components/OnlineStatus';
import { syncPendingSubmissions } from '../lib/backgroundSync';
import type { Database } from '../lib/database.types';

type FormRow = Database['public']['Tables']['forms']['Row'];

interface FormWithProject extends FormRow {
  projects: {
    name: string;
  };
}

export function FieldWorkerDashboard() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineFormIds, setOfflineFormIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadForms();
    loadOfflineForms();
    loadPendingCount();
    loadUserEmail();

    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUserEmail(data.user.email || '');
    }
  };

  const loadPendingCount = async () => {
    try {
      const pending = await getPendingSubmissions();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Error loading pending submissions:', err);
    }
  };

  const loadForms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          projects!inner (
            name,
            user_project_access!inner (
              user_id
            )
          )
        `)
        .eq('is_active', true)
        .eq('projects.user_project_access.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data as any || []);
    } catch (err) {
      console.error('Error loading forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineForms = async () => {
    try {
      const offline = await getAllOfflineForms();
      setOfflineFormIds(new Set(offline.map(f => f.id)));
    } catch (err) {
      console.error('Error loading offline forms:', err);
    }
  };

  const handleDownloadForm = async (form: FormWithProject) => {
    setDownloadingIds(prev => new Set(prev).add(form.id));
    try {
      const parsed = parseXForm(form.xml_content);
      await saveFormOffline(form, parsed.fields);
      setOfflineFormIds(prev => new Set(prev).add(form.id));
      alert('Form downloaded for offline use!');
    } catch (err) {
      console.error('Error downloading form:', err);
      alert('Failed to download form');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(form.id);
        return next;
      });
    }
  };

  const handleRemoveOfflineForm = async (formId: string) => {
    try {
      await deleteOfflineForm(formId);
      setOfflineFormIds(prev => {
        const next = new Set(prev);
        next.delete(formId);
        return next;
      });
      alert('Offline form removed');
    } catch (err) {
      console.error('Error removing offline form:', err);
      alert('Failed to remove offline form');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const results = await syncPendingSubmissions();
      if (results.success > 0) {
        alert(`Successfully synced ${results.success} submission(s)!`);
      }
      if (results.failed > 0) {
        alert(`Failed to sync ${results.failed} submission(s). Will retry later.`);
      }
      if (results.success === 0 && results.failed === 0) {
        alert('No pending submissions to sync');
      }
      loadPendingCount();
    } catch (err) {
      console.error('Sync error:', err);
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('field_worker_session');
    navigate('/field/login');
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
      <OnlineStatus />

      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">My Forms</h1>
                <p className="text-xs text-gray-600">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {pendingCount > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CloudOff className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">{pendingCount} submission(s) pending sync</h3>
                  <p className="text-sm text-amber-700">Will sync automatically when online</p>
                </div>
              </div>
              {navigator.onLine && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {forms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms assigned</h3>
            <p className="text-gray-600">Contact your administrator to get access to forms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    {offlineFormIds.has(form.id) && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                        <CloudOff className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                      v{form.version}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {form.name}
                </h3>

                {form.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <span className="text-xs text-gray-500 block">
                    {form.projects.name}
                  </span>

                  <Link
                    to={`/field/collect/${form.id}`}
                    className="block w-full text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      Collect Data
                    </div>
                  </Link>

                  {offlineFormIds.has(form.id) ? (
                    <button
                      onClick={() => handleRemoveOfflineForm(form.id)}
                      className="w-full text-xs px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Offline
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDownloadForm(form)}
                      disabled={downloadingIds.has(form.id)}
                      className="w-full text-xs px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      {downloadingIds.has(form.id) ? 'Downloading...' : 'Download for Offline'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Mobile-First Data Collection</h3>
          <p className="text-sm text-blue-800 mb-4">
            Download forms on WiFi and collect data anywhere, even without internet. Your submissions will sync automatically when you're back online.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-blue-700">
            <span className="px-3 py-1.5 bg-blue-100 rounded-lg">Works Offline</span>
            <span className="px-3 py-1.5 bg-blue-100 rounded-lg">GPS Capture</span>
            <span className="px-3 py-1.5 bg-blue-100 rounded-lg">Photo & Video</span>
            <span className="px-3 py-1.5 bg-blue-100 rounded-lg">Audio Recording</span>
            <span className="px-3 py-1.5 bg-blue-100 rounded-lg">Auto Sync</span>
          </div>
        </div>
      </main>
    </div>
  );
}
