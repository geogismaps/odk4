import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, Smartphone, Download, Trash2, CloudOff } from 'lucide-react';
import { saveFormOffline, getAllOfflineForms, deleteOfflineForm } from '../lib/offlineStorage';
import { parseXForm } from '../lib/xmlParser';
import { OnlineStatus } from '../components/OnlineStatus';
import type { Database } from '../lib/database.types';

type FormRow = Database['public']['Tables']['forms']['Row'];

interface FormWithProject extends FormRow {
  projects: {
    name: string;
  };
}

export function Forms() {
  const { userProfile } = useAuth();
  const [forms, setForms] = useState<FormWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineFormIds, setOfflineFormIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadForms();
    loadOfflineForms();
  }, []);

  const loadOfflineForms = async () => {
    try {
      const offline = await getAllOfflineForms();
      setOfflineFormIds(new Set(offline.map(f => f.id)));
    } catch (err) {
      console.error('Error loading offline forms:', err);
    }
  };

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          projects (
            name
          )
        `)
        .eq('is_active', true)
        .in('project_id', [
          supabase
            .from('projects')
            .select('id')
            .eq('company_id', userProfile?.company_id || '')
            .eq('is_active', true)
        ])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data as FormWithProject[] || []);
    } catch (err) {
      console.error('Error loading forms:', err);
    } finally {
      setLoading(false);
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
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Available Forms</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {forms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms available</h3>
            <p className="text-gray-600">Contact your admin to add forms to projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={`/collect/${form.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
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

                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {form.name}
                </h3>

                {form.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {form.projects.name}
                    </span>
                    <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                      <Smartphone className="w-4 h-4" />
                      <span>Collect</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {offlineFormIds.has(form.id) ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveOfflineForm(form.id);
                        }}
                        className="flex-1 text-xs px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Offline
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownloadForm(form);
                        }}
                        disabled={downloadingIds.has(form.id)}
                        className="flex-1 text-xs px-2 py-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {downloadingIds.has(form.id) ? 'Downloading...' : 'Download'}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Mobile Data Collection</h3>
          <p className="text-sm text-blue-800 mb-4">
            For the best experience, add this app to your home screen. This allows offline data collection
            and automatic syncing when you're back online.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-blue-700">
            <span className="px-2 py-1 bg-blue-100 rounded">✓ Works offline</span>
            <span className="px-2 py-1 bg-blue-100 rounded">✓ GPS capture</span>
            <span className="px-2 py-1 bg-blue-100 rounded">✓ Photo & video</span>
            <span className="px-2 py-1 bg-blue-100 rounded">✓ Audio recording</span>
          </div>
        </div>
      </main>
    </div>
  );
}
