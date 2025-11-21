import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Setup } from './pages/Setup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { Projects } from './pages/Projects';
import { ProjectForms } from './pages/ProjectForms';
import { ProjectSubmissions } from './pages/ProjectSubmissions';
import { Forms } from './pages/Forms';
import { FormCollect } from './pages/FormCollect';
import { FieldWorkerLogin } from './pages/FieldWorkerLogin';
import { FieldWorkerDashboard } from './pages/FieldWorkerDashboard';
import { FieldWorkerCollect } from './pages/FieldWorkerCollect';
import { ProjectAssignUsers } from './pages/ProjectAssignUsers';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requireAdmin>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/forms"
            element={
              <ProtectedRoute>
                <ProjectForms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/assign-users"
            element={
              <ProtectedRoute requireAdmin>
                <ProjectAssignUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/submissions"
            element={
              <ProtectedRoute>
                <ProjectSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms"
            element={
              <ProtectedRoute>
                <Forms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collect/:formId"
            element={
              <ProtectedRoute>
                <FormCollect />
              </ProtectedRoute>
            }
          />
          <Route path="/field/login" element={<FieldWorkerLogin />} />
          <Route
            path="/field/forms"
            element={
              <ProtectedRoute>
                <FieldWorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/field/collect/:formId"
            element={
              <ProtectedRoute>
                <FieldWorkerCollect />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
