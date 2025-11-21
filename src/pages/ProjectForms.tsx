import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { parseXForm, mapODKTypeToTeable } from '../lib/xmlParser';
import { FileText, Upload, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Database } from '../lib/database.types';

type FormRow = Database['public']['Tables']['forms']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];

export function ProjectForms() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectResult, formsResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId!)
          .maybeSingle(),
        supabase
          .from('forms')
          .select('*')
          .eq('project_id', projectId!)
          .order('created_at', { ascending: false }),
      ]);

      if (projectResult.error) throw projectResult.error;
      if (formsResult.error) throw formsResult.error;

      setProject(projectResult.data);
      setForms(formsResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? All submissions will be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting form:', err);
      alert('Failed to delete form');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Project not found</p>
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
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                  <p className="text-sm text-gray-600">Forms</p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload Form
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {forms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-6">
              {isAdmin
                ? 'Upload an ODK XForm to get started'
                : 'Contact your admin to upload a form'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload Form
              </button>
            )}
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
                  {!form.is_active && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {form.name}
                </h3>
                {form.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">v{form.version}</span>
                  <div className="flex gap-2">
                    <Link
                      to={`/collect/${form.id}`}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Collect
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showUploadModal && (
        <UploadFormModal
          projectId={projectId!}
          project={project}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            loadData();
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
}

interface UploadFormModalProps {
  projectId: string;
  project: ProjectRow;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadFormModal({ projectId, project, onClose, onSuccess }: UploadFormModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingTeableTable, setCreatingTeableTable] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setLoading(true);

    try {
      const xmlContent = await file.text();
      const parsed = parseXForm(xmlContent);

      console.log('Parsed XForm:', {
        formId: parsed.formId,
        title: parsed.title,
        version: parsed.version,
        fieldCount: parsed.fields.length,
        fields: parsed.fields,
      });

      let teableError = null;
      if (project.teable_base_url && project.teable_api_token && project.teable_base_id) {
        setCreatingTeableTable(true);
        try {
          await createTeableTable(project, parsed);
        } catch (teableErr: any) {
          console.error('Teable table creation failed:', teableErr);
          teableError = teableErr.message;
        } finally {
          setCreatingTeableTable(false);
        }
      }

      const { error: insertError } = await supabase
        .from('forms')
        .insert({
          project_id: projectId,
          name: parsed.title,
          xml_content: xmlContent,
          version: parsed.version,
        });

      if (insertError) throw insertError;

      if (teableError) {
        alert(`Form created, but Teable table creation failed: ${teableError}\n\nYou can create the table manually in Teable.`);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error uploading form:', err);
      setError(err.message || 'Failed to upload form');
    } finally {
      setLoading(false);
      setCreatingTeableTable(false);
    }
  };

  const createTeableTable = async (proj: ProjectRow, parsed: any) => {
    const tableName = parsed.title.replace(/[^a-zA-Z0-9]/g, '_');

    console.log('Creating Teable table with:', {
      baseUrl: proj.teable_base_url,
      baseId: proj.teable_base_id,
      hasToken: !!proj.teable_api_token,
      tokenLength: proj.teable_api_token?.length,
      parsedFieldsCount: parsed.fields?.length || 0,
      parsedFields: parsed.fields,
    });

    if (!parsed.fields || parsed.fields.length === 0) {
      throw new Error('No fields found in the form XML. Please check the XML format.');
    }

    const fields = parsed.fields.map((field: any) => {
      const teableType = mapODKTypeToTeable(field.type);
      console.log(`Mapping field: ${field.name} (${field.type}) -> ${teableType}`);
      return {
        name: field.name,
        type: teableType,
        options: field.choices
          ? { choices: field.choices.map((c: any) => ({ name: c.value })) }
          : undefined,
      };
    });

    console.log('Teable fields to create:', fields);

    const response = await fetch(`${proj.teable_base_url}/api/base/${proj.teable_base_id}/table`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${proj.teable_api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: tableName,
        fields: [
          { name: 'Submission ID', type: 'singleLineText' },
          { name: 'Submitted By', type: 'singleLineText' },
          { name: 'Submitted At', type: 'date' },
          ...fields,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Teable API error:', response.status, errorText);
      throw new Error(`Failed to create Teable table: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    await supabase
      .from('projects')
      .update({
        teable_table_id: data.id,
        teable_table_name: tableName,
      })
      .eq('id', projectId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload ODK Form</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {creatingTeableTable && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Creating Teable table...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              XForm XML File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".xml"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500">XML files only</p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
