import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  FileSpreadsheet,
  Settings,
  Warehouse,
  ClipboardList,
  TrendingUp,
  Wallet,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { creditsApi } from '../api/credits';

type DockItem = { id: string; href: string; label: string; icon: LucideIcon; color: string };
const DOCK_MODULES: Array<DockItem | { separator: true }> = [
  { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#818CF8' },
  { id: 'pos', href: '/pos', label: 'Point de Vente', icon: ShoppingCart, color: '#10B981' },
  { id: 'products', href: '/products', label: 'Produits', icon: Package, color: '#F59E0B' },
  { id: 'stock', href: '/stock', label: 'Stock', icon: Warehouse, color: '#3B82F6' },
  { id: 'inventory', href: '/entries', label: 'Entrées', icon: ClipboardList, color: '#8B5CF6' },
  { id: 'sales', href: '/sales', label: 'Ventes', icon: TrendingUp, color: '#10B981' },
  { id: 'quotes', href: '/quotes', label: 'Devis', icon: FileSpreadsheet, color: '#6366F1' },
  { separator: true },
  { id: 'clients', href: '/clients', label: 'Clients', icon: Users, color: '#F472B6' },
  { id: 'credits', href: '/credits', label: 'Crédits clients', icon: Wallet, color: '#F59E0B' },
  { id: 'suppliers', href: '/suppliers', label: 'Fournisseurs', icon: Truck, color: '#FB923C' },
  { id: 'invoices', href: '/entries', label: 'Factures', icon: FileText, color: '#34D399' },
  { separator: true },
  { id: 'admin', href: '/management', label: 'Admin', icon: Settings, color: '#94A3B8' },
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const DEFAULT_SIZE = 36;
const HOVER_SIZE = 44;
const NEIGHBOR_SIZE = 40;
const NEXT_NEIGHBOR_SIZE = 38;

export function Dock() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [creditOverdueCount, setCreditOverdueCount] = useState<number>(0);
  const profileRef = useRef<HTMLDivElement>(null);

  const isManagement = location.pathname.startsWith('/management');

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    creditsApi.getOverdueCount().then((res) => setCreditOverdueCount(res.count)).catch(() => setCreditOverdueCount(0));
    const interval = setInterval(() => {
      creditsApi.getOverdueCount().then((res) => setCreditOverdueCount(res.count)).catch(() => setCreditOverdueCount(0));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSize = (index: number): number => {
    if (hoveredIndex === null) return DEFAULT_SIZE;
    const d = Math.abs(index - hoveredIndex);
    if (d === 0) return HOVER_SIZE;
    if (d === 1) return NEIGHBOR_SIZE;
    if (d === 2) return NEXT_NEIGHBOR_SIZE;
    return DEFAULT_SIZE;
  };

  const pathMatches = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  let iconIndex = 0;
  return (
    <div
      className="fixed z-[9999] flex items-center justify-center"
      style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
    >
      <div
        className="flex items-center rounded-[20px] flex-shrink-0"
        style={{
          height: 56,
          padding: '8px 16px',
          gap: 6,
          background: 'rgba(20, 20, 28, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {DOCK_MODULES.map((module, i) => {
          if ('separator' in module && module.separator) {
            return (
              <div
                key={`sep-${i}`}
                className="flex-shrink-0 self-center"
                style={{
                  width: 1,
                  height: 20,
                  margin: '0 4px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              />
            );
          }
          const item = module as DockItem;
          const idx = iconIndex++;
          const Icon = item.icon;
          const isActive = pathMatches(item.href);
          const size = getSize(idx);
          const containerBg = isActive ? hexToRgba(item.color, 0.18) : hexToRgba(item.color, 0.1);

          return (
            <div
              key={item.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: hoveredIndex === idx ? 1 : 0, y: hoveredIndex === idx ? 0 : 2 }}
                transition={{ duration: 0.12 }}
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  bottom: '100%',
                  left: '50%',
                  marginBottom: 10,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  className="rounded-[5px]"
                  style={{
                    background: '#252532',
                    border: '1px solid #363648',
                    fontSize: 11,
                    color: 'var(--color-text-primary)',
                    padding: '3px 8px',
                  }}
                >
                  {item.label}
                </div>
              </motion.div>

              <Link to={item.href} className="flex flex-col items-center outline-none">
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className="relative flex items-center justify-center flex-shrink-0 rounded-[10px]"
                  style={{
                    width: size,
                    height: size,
                    minWidth: size,
                    minHeight: size,
                    background: containerBg,
                    border: isActive ? `1px solid ${hexToRgba(item.color, 0.4)}` : 'none',
                  }}
                >
                  <Icon
                    className="flex-shrink-0"
                    size={18}
                    style={{ color: item.color }}
                  />
                  {item.id === 'credits' && creditOverdueCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-danger border-2 border-[rgba(20,20,28,0.9)]"
                      style={{ padding: '0 4px' }}
                    >
                      {creditOverdueCount > 99 ? '99+' : creditOverdueCount}
                    </span>
                  )}
                </motion.div>
                {isActive && (
                  <div
                    className="rounded-full flex-shrink-0 mt-0.5"
                    style={{
                      width: 4,
                      height: 4,
                      background: item.color,
                      boxShadow: `0 0 6px ${hexToRgba(item.color, 0.8)}`,
                    }}
                  />
                )}
              </Link>
            </div>
          );
        })}

        {/* Séparateur puis profil en bas à droite du dock */}
        <div
          className="flex-shrink-0 self-center"
          style={{
            width: 1,
            height: 20,
            margin: '0 4px',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <div ref={profileRef} className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center justify-center rounded-[10px] flex-shrink-0 w-9 h-9 text-[11px] font-semibold text-text-primary transition-colors hover:opacity-90"
            style={{
              background: 'rgba(148, 163, 184, 0.1)',
              border: profileOpen ? '1px solid rgba(148, 163, 184, 0.4)' : 'none',
            }}
            title={user ? `${user.firstName} ${user.lastName}` : 'Profil'}
          >
            {user?.firstName?.[0]?.toUpperCase() ?? '?'}
          </button>
          {profileOpen && (
            <div
              className="absolute right-0 rounded-[6px] border border-border-subtle overflow-hidden min-w-[140px] z-[10000]"
              style={{
                bottom: '100%',
                marginBottom: 10,
                background: '#252532',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {user?.role === 'ADMIN' && !isManagement && (
                <Link
                  to="/management"
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Administration
                </Link>
              )}
              <button
                type="button"
                onClick={() => { setProfileOpen(false); logout(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-text-secondary hover:bg-white/[0.06] hover:text-danger transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
