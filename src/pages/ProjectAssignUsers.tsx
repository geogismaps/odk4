import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, Save, CheckSquare, Square } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];

export function ProjectAssignUsers() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectResult, usersResult, assignmentsResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId!)
          .maybeSingle(),
        supabase
          .from('users')
          .select('*')
          .eq('company_id', userProfile?.company_id || '')
          .eq('role', 'field_worker')
          .order('email'),
        supabase
          .from('user_project_access')
          .select('user_id')
          .eq('project_id', projectId!),
      ]);

      if (projectResult.error) throw projectResult.error;
      if (usersResult.error) throw usersResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setProject(projectResult.data);
      setUsers(usersResult.data || []);
      setSelectedUserIds(
        new Set(assignmentsResult.data?.map(a => a.user_id) || [])
      );
    } catch (err) {
      console.error('Error loading data:', err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('user_project_access')
        .delete()
        .eq('project_id', projectId!);

      if (selectedUserIds.size > 0) {
        const assignments = Array.from(selectedUserIds).map(userId => ({
          user_id: userId,
          project_id: projectId!,
        }));

        const { error } = await supabase
          .from('user_project_access')
          .insert(assignments);

        if (error) throw error;
      }

      alert('User assignments saved successfully!');
      navigate(`/projects/${projectId}/forms`);
    } catch (err) {
      console.error('Error saving assignments:', err);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
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
                to={`/projects/${projectId}/forms`}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Assign Field Workers</h1>
                  <p className="text-sm text-gray-600">{project.name}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Field Workers</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUserIds.size} of {users.length} selected
                </p>
              </div>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                {selectedUserIds.size === users.length ? (
                  <>
                    <Square className="w-4 h-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </>
                )}
              </button>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No field workers found</h3>
              <p className="text-gray-600">
                Create field worker accounts in User Management first
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => handleToggleUser(user.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {user.email.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-600">Field Worker</p>
                      </div>
                    </div>
                  </div>
                  {selectedUserIds.has(user.id) && (
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                      Assigned
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Access Control</h3>
          <p className="text-sm text-blue-800">
            Field workers will only see forms from projects they are assigned to. They can download
            forms for offline use and submit data through the field worker interface.
          </p>
        </div>
      </main>
    </div>
  );
}
