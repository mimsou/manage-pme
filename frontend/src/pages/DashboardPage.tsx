import { useEffect, useState } from 'react';
import { dashboardApi } from '@/api/dashboard';
import { Button } from '../components/ui/Button';
import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  ArrowDownCircle,
  Filter,
  X,
  BarChart3,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function getCurrencyLabel(code: string): string {
  const map: Record<string, string> = {
    TND: 'TND',
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    JPY: '¥',
    CAD: 'CAD',
    MAD: 'MAD',
    DZD: 'DZD',
    SAR: 'SAR',
    AED: 'AED',
    KWD: 'KWD',
    CNY: '¥',
  };
  return map[code] || code;
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { positive: boolean; value: string };
  icon: LucideIcon;
  iconColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[10px] border border-[#2A2A38] transition-[border-color,box-shadow] duration-200 hover:border-[#363648] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
      style={{
        height: 88,
        padding: 14,
        background: '#1E1E28',
      }}
    >
      <div
        className="absolute top-0 right-0 flex items-center justify-center opacity-[0.05]"
        style={{ width: 48, height: 48, color: iconColor }}
      >
        <Icon size={48} />
      </div>
      <p
        className="text-[10px] font-medium text-text-muted uppercase tracking-[0.06em] mb-1.5"
        style={{ marginBottom: 6 }}
      >
        {label}
      </p>
      <p className="text-[24px] font-bold font-mono text-text-primary leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] uppercase tracking-[0.05em] text-text-muted mt-0.5">
          {sub}
        </p>
      )}
      {trend && (
        <div className="flex items-center gap-0.5 mt-1">
          {trend.positive ? (
            <TrendingUp className="text-success flex-shrink-0" size={10} />
          ) : (
            <TrendingDown className="text-danger flex-shrink-0" size={10} />
          )}
          <span
            className={`text-[11px] ${trend.positive ? 'text-success' : 'text-danger'}`}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .getSalesChart({ startDate: startDate || undefined, endDate: endDate || undefined })
      .then((data) => {
        if (!cancelled) setChartData(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setChartData([]);
      });
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getStats({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = startDate || endDate;

  const currencySymbol =
    (stats?.defaultCurrencyCode && getCurrencyLabel(stats.defaultCurrencyCode)) || '€';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh] text-text-secondary text-[13px]">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ marginBottom: 20 }}>
      {/* Page header: title left, compact date filter right, same row */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Dashboard</h1>
        <div className="flex items-center gap-2" style={{ height: 30 }}>
          <Filter className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input flex-shrink-0"
            style={{ width: 130, height: 30, padding: '0 8px', fontSize: 13 }}
          />
          <span className="text-text-muted text-[13px]">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input flex-shrink-0"
            style={{ width: 130, height: 30, padding: '0 8px', fontSize: 13 }}
          />
          <Button variant="secondary" size="sm" className="h-[30px] px-2 text-[12px]" onClick={() => fetchStats()}>
            Appliquer
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-[30px] px-2 text-[12px]">
              <X className="w-3 h-3 mr-1" />
              Réinit.
            </Button>
          )}
        </div>
      </div>

      {/* Bento grid: 12 columns, 12px gap */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateAreas: `
            "k1 k1 k1 k2 k2 k2 k3 k3 k3 k4 k4 k4"
            "chart chart chart chart chart chart chart chart alerts alerts alerts alerts"
            "top top top top top recent recent recent recent cash cash cash"
          `,
        }}
      >
        <div style={{ gridArea: 'k1' }}>
          <KpiCard
            label="Total Ventes"
            value={stats?.totalSales ?? 0}
            icon={ShoppingCart}
            iconColor="#6366F1"
          />
        </div>
        <div style={{ gridArea: 'k2' }}>
          <KpiCard
            label="Chiffre d'Affaires"
            value={stats?.totalRevenue ? Number(stats.totalRevenue).toFixed(2) + ' ' + currencySymbol : '0 ' + currencySymbol}
            icon={DollarSign}
            iconColor="#6366F1"
          />
        </div>
        <div style={{ gridArea: 'k3' }}>
          <KpiCard
            label="Marge Brute"
            value={stats?.totalMargin ? Number(stats.totalMargin).toFixed(2) + ' ' + currencySymbol : '0 ' + currencySymbol}
            icon={TrendingUp}
            iconColor="#10B981"
          />
        </div>
        <div style={{ gridArea: 'k4' }}>
          <KpiCard
            label="Entrées"
            value={stats?.totalPurchases ?? 0}
            sub={stats?.totalPurchaseAmount ? Number(stats.totalPurchaseAmount).toFixed(2) + ' ' + currencySymbol : undefined}
            icon={ArrowDownCircle}
            iconColor="#3B82F6"
          />
        </div>

        <div style={{ gridArea: 'chart' }}>
          <div
            className="rounded-[10px] border border-[#2A2A38] overflow-hidden"
            style={{ background: '#1E1E28', padding: 16 }}
          >
            <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
              <h3 className="section-heading" style={{ fontSize: 13 }}>Chiffre d'affaires</h3>
              <span className="text-[11px] text-text-muted">
                {startDate && endDate ? `${startDate} – ${endDate}` : 'Toute période'}
              </span>
            </div>
            <div style={{ height: 180 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
                        <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v} ${currencySymbol}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#252532',
                        border: '1px solid #2A2A38',
                        borderRadius: 6,
                        padding: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <BarChart3
                    className="flex-shrink-0 text-text-muted"
                    style={{ width: 32, height: 32, color: 'rgba(99,102,241,0.3)' }}
                  />
                  <p className="text-[12px] text-text-muted mt-2 font-medium">Aucune donnée</p>
                  <p className="text-[11px] text-text-muted mt-0.5">Sur la période sélectionnée</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ gridArea: 'alerts' }}>
          <div
            className="rounded-[10px] border border-[#2A2A38] overflow-hidden"
            style={{ background: '#1E1E28', padding: 16 }}
          >
            <h3 className="section-heading mb-3" style={{ fontSize: 13 }}>Alertes stock</h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text-secondary">Entrées en attente</span>
                <span className="font-mono font-semibold text-text-primary">{stats?.pendingPurchases ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Produits en stock bas</span>
                <span className="font-mono font-semibold text-danger">{stats?.lowStockProducts?.length ?? 0}</span>
              </div>
              {stats?.lowStockProducts?.slice(0, 4).map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-1.5 border-b border-border-subtle last:border-0 text-[13px]"
                >
                  <span className="text-text-primary truncate pr-2">{p.name}</span>
                  <span className="font-mono text-danger flex-shrink-0 text-[12px]">
                    {p.stockCurrent} / {p.stockMin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ gridArea: 'top' }}>
          <div
            className="rounded-[10px] border border-[#2A2A38] overflow-hidden"
            style={{ background: '#1E1E28', padding: 16 }}
          >
            <h3 className="section-heading mb-3" style={{ fontSize: 13 }}>Top Produits</h3>
            <div className="space-y-0">
              {stats?.topProducts?.slice(0, 5).map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1.5 border-b border-border-subtle last:border-0 hover:bg-white/[0.025] transition-colors text-[13px]"
                >
                  <span className="text-text-secondary">{item.product?.name || 'N/A'}</span>
                  <span className="font-mono font-medium text-text-primary">{item._sum?.quantity ?? 0} vendus</span>
                </div>
              ))}
              {(!stats?.topProducts || stats.topProducts.length === 0) && (
                <p className="text-[13px] text-text-muted py-2">Aucune vente</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ gridArea: 'recent' }}>
          <div
            className="rounded-[10px] border border-[#2A2A38]"
            style={{ background: '#1E1E28', padding: 16 }}
          >
            <h3 className="section-heading mb-3" style={{ fontSize: 13 }}>Activité récente</h3>
            <p className="text-[13px] text-text-muted">Dernières transactions sur la page Ventes.</p>
          </div>
        </div>

        <div style={{ gridArea: 'cash' }}>
          <div
            className="rounded-[10px] border border-[#2A2A38]"
            style={{ background: '#1E1E28', padding: 16 }}
          >
            <h3 className="section-heading mb-3" style={{ fontSize: 13 }}>Résumé</h3>
            <div className="flex justify-between text-[13px]">
              <span className="text-text-muted">Stock bas</span>
              <span className="font-mono text-text-primary">{stats?.lowStockProducts?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
