import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Building2, Users, ArrowLeft, Coins } from 'lucide-react';

export default function ManagementLayout() {
  const location = useLocation();
  const { user } = useAuthStore();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const nav = [
    { name: 'Identité de la société', href: '/management/company', icon: Building2 },
    { name: 'Devise et change', href: '/management/currency', icon: Coins },
    { name: 'Utilisateurs', href: '/management/users', icon: Users },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-base">
      <div className="flex h-screen">
        <aside className="w-56 border-r border-border-subtle" style={{ background: '#17171D' }}>
          <div className="p-4">
            <Link to="/" className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-brand mb-3 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour à l'app
            </Link>
            <h1 className="page-title text-brand" style={{ fontSize: 18 }}>Administration</h1>
            <p className="text-[11px] text-text-muted mt-0.5">Gestion de l'application</p>
          </div>
          <nav className="px-2 space-y-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-[13px] transition-colors ${
                    isActive(item.href) ? 'bg-brand/20 text-brand' : 'text-text-primary hover:bg-elevated'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="pt-6 px-7" style={{ paddingTop: 24, paddingLeft: 28, paddingRight: 28 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
