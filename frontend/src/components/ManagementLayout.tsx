import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Building2, Users, ArrowLeft } from 'lucide-react';

export default function ManagementLayout() {
  const location = useLocation();
  const { user } = useAuthStore();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const nav = [
    { name: 'Identité de la société', href: '/management/company', icon: Building2 },
    { name: 'Utilisateurs', href: '/management/users', icon: Users },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 mb-4">
              <ArrowLeft className="w-4 h-4" /> Retour à l'app
            </Link>
            <h1 className="text-xl font-bold text-primary-600">Administration</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gestion de l'application
            </p>
          </div>
          <nav className="px-3 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
