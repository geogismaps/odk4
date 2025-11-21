import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, FolderOpen, FileText, LogOut } from 'lucide-react';

export function Dashboard() {
  const { userProfile, signOut, isAdmin } = useAuth();

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Please complete the setup process to create your account.</p>
          <Link
            to="/setup"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Setup
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Projects',
      description: 'Manage your data collection projects',
      icon: FolderOpen,
      link: '/projects',
      color: 'bg-blue-500',
      show: true
    },
    {
      title: 'Forms',
      description: 'Access forms for data collection',
      icon: FileText,
      link: '/forms',
      color: 'bg-green-500',
      show: true
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      link: '/users',
      color: 'bg-purple-500',
      show: isAdmin
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Data Collection Platform</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.username}
          </h2>
          <p className="text-gray-600">
            Choose an option below to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.filter(card => card.show).map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 group"
            >
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
