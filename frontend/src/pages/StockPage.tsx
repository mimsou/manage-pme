import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { History, Package, Search, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { stockApi } from '@/api/stock';
import type { StockMovement, StockSnapshotLine, StockSnapshotResponse } from '@/types/stock';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

type SortKey = 'productName' | 'qty' | 'valueSale' | 'categoryName';

const MOVEMENT_LABELS: Partial<Record<string, string>> = {
  ENTRY: 'Entrée',
  EXIT: 'Sortie',
  SALE: 'Vente',
  INVENTORY: 'Inventaire',
  ADJUSTMENT: 'Ajustement',
  RETURN: 'Retour fournisseur',
  REFUND: 'Avoir',
  LOSS: 'Perte',
  THEFT: 'Vol',
  DAMAGE: 'Casse',
};

export default function StockPage() {
  const { formatInDefault, loading: currencyLoading, currencyLabel } = useDefaultCurrency();
  const [snapshot, setSnapshot] = useState<StockSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortAsc, setSortAsc] = useState(true);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProductName, setHistoryProductName] = useState('');
  const [historyMovements, setHistoryMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockApi.getSnapshot();
      setSnapshot(data);
    } catch {
      toast.error('Impossible de charger le stock');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions = useMemo(() => {
    if (!snapshot) return [];
    const map = new Map<string, string>();
    for (const c of snapshot.byCategory) {
      map.set(c.categoryId, c.categoryName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [snapshot]);

  const filteredLines = useMemo(() => {
    if (!snapshot) return [];
    const q = search.trim().toLowerCase();
    return snapshot.lines.filter((line) => {
      if (categoryId && line.categoryId !== categoryId) return false;
      if (lowStockOnly && !line.isLowStock) return false;
      if (!q) return true;
      return (
        line.productName.toLowerCase().includes(q) ||
        line.sku.toLowerCase().includes(q) ||
        (line.barcode && line.barcode.includes(q)) ||
        (line.variantLabel && line.variantLabel.toLowerCase().includes(q))
      );
    });
  }, [snapshot, search, categoryId, lowStockOnly]);

  const kpiTotals = useMemo(() => {
    return filteredLines.reduce(
      (acc, line) => ({
        totalQty: acc.totalQty + line.qty,
        valuePurchase: acc.valuePurchase + line.valuePurchase,
        valueSale: acc.valueSale + line.valueSale,
        valuePmp: acc.valuePmp + line.valuePmp,
      }),
      { totalQty: 0, valuePurchase: 0, valueSale: 0, valuePmp: 0 },
    );
  }, [filteredLines]);

  const sortedLines = useMemo(() => {
    const arr = [...filteredLines];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'productName':
          cmp = a.productName.localeCompare(b.productName, 'fr');
          break;
        case 'categoryName':
          cmp = a.categoryName.localeCompare(b.categoryName, 'fr');
          break;
        case 'qty':
          cmp = a.qty - b.qty;
          break;
        case 'valueSale':
          cmp = a.valueSale - b.valueSale;
          break;
        default:
          cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filteredLines, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const openHistory = async (line: StockSnapshotLine) => {
    setHistoryProductName(line.variantLabel ? `${line.productName} (${line.variantLabel})` : line.productName);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryMovements([]);
    try {
      const res = await stockApi.getProductHistory(line.productId);
      setHistoryMovements(res.movements || []);
    } catch {
      toast.error('Impossible de charger l’historique');
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading || !snapshot) {
    return (
      <div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>
          Stock
        </h1>
        <p className="text-[13px] text-text-secondary">Chargement du stock…</p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="page-title" style={{ marginBottom: 8 }}>
          Stock et valorisation
        </h1>
        <p className="text-[13px] text-text-secondary max-w-3xl leading-relaxed">
          <strong>Valorisation achat</strong> : quantités × prix d’achat courant (fiche produit ou variante).{' '}
          <strong>PMP</strong> : prix moyen pondéré calculé à partir des réceptions d’achat (même PMP au niveau
          produit pour toutes les variantes si achats au niveau parent). Sans historique d’achat, le PMP affiché est
          le prix d’achat catalogue. <strong>Valeur vente</strong> : quantités × prix de vente courant. Mis à jour :{' '}
          {new Date(snapshot.generatedAt).toLocaleString('fr-FR')}
          {currencyLoading ? '' : ` · devise affichée : ${currencyLabel}`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <KpiCard
          title="Quantités (unités)"
          subtitle="Somme des lignes filtrées"
          value={String(kpiTotals.totalQty)}
          icon={<Package className="w-5 h-5" />}
        />
        <KpiCard
          title="Valeur achat"
          subtitle="Prix d’achat courant × qty"
          value={formatInDefault(kpiTotals.valuePurchase)}
          icon={<span className="text-[13px] font-medium text-text-secondary">A</span>}
        />
        <KpiCard
          title="Valeur au PMP"
          subtitle="PMP achats ou catalogue"
          value={formatInDefault(kpiTotals.valuePmp)}
          icon={<span className="text-[13px] font-medium text-text-secondary">Σ</span>}
        />
        <KpiCard
          title="Valeur vente"
          subtitle="Prix de vente × qty"
          value={formatInDefault(kpiTotals.valueSale)}
          icon={<span className="text-[13px] font-medium text-text-secondary">V</span>}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher nom, SKU, code-barres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-8 h-9 text-[13px]"
          />
        </div>
        <div className="w-[220px]">
          <Select
            options={[
              { value: '', label: 'Toutes les catégories' },
              ...categoryOptions.map(([id, name]) => ({ value: id, label: name })),
            ]}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input h-9 text-[13px] w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-border-subtle"
          />
          Stock bas uniquement
        </label>
      </div>

      <div className="mb-8">
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">Synthèse par catégorie</h2>
        <div className="overflow-x-auto rounded-[10px] border border-border-subtle" style={{ background: '#1E1E28' }}>
          <table className="w-full text-[13px]">
            <thead style={{ background: '#252532' }}>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Catégorie</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Qté</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Val. achat</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Val. PMP</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Val. vente</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.byCategory.map((row) => (
                <tr key={row.categoryId} className="border-b border-border-subtle/80 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-text-primary">{row.categoryName}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.totalQty}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-secondary">
                    {formatInDefault(row.valuePurchase)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-secondary">
                    {formatInDefault(row.valuePmp)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-secondary">
                    {formatInDefault(row.valueSale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          Totaux globaux catalogue (tous produits actifs). Les filtres ci-dessus n’affectent pas ce tableau.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Détail par SKU ({sortedLines.length})
          </h2>
        </div>
        <div className="overflow-x-auto rounded-[10px] border border-border-subtle" style={{ background: '#1E1E28' }}>
          <table className="w-full text-[13px] min-w-[1000px]">
            <thead style={{ background: '#252532' }}>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary"
                    onClick={() => toggleSort('productName')}
                  >
                    Produit <ArrowUpDown className="w-3 w-3" />
                  </button>
                </th>
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Variante</th>
                <th className="text-left px-3 py-2 font-medium text-text-secondary">SKU</th>
                <th className="text-left px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary"
                    onClick={() => toggleSort('categoryName')}
                  >
                    Catégorie <ArrowUpDown className="w-3 w-3" />
                  </button>
                </th>
                <th className="text-right px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary ml-auto"
                    onClick={() => toggleSort('qty')}
                  >
                    Qté <ArrowUpDown className="w-3 w-3" />
                  </button>
                </th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Seuil</th>
                <th className="text-center px-3 py-2 font-medium text-text-secondary">Statut</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary" title="Prix d’achat courant">
                  PU achat
                </th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary" title="PMP unitaire (produit)">
                  PU PMP
                </th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Val. achat</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Val. PMP</th>
                <th className="text-right px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary ml-auto"
                    onClick={() => toggleSort('valueSale')}
                  >
                    Val. vente <ArrowUpDown className="w-3 w-3" />
                  </button>
                </th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary"></th>
              </tr>
            </thead>
            <tbody>
              {sortedLines.map((line) => (
                <tr key={line.lineKey} className="border-b border-border-subtle/80 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-text-primary">{line.productName}</td>
                  <td className="px-3 py-2 text-text-secondary text-[12px]">{line.variantLabel ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-muted">{line.sku}</td>
                  <td className="px-3 py-2 text-text-secondary">{line.categoryName}</td>
                  <td className="px-3 py-2 text-right font-mono">{line.qty}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-muted">{line.stockMin}</td>
                  <td className="px-3 py-2 text-center">
                    {line.isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Bas
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-500/90">OK</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">
                    {formatInDefault(line.unitPurchasePrice)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]" title={line.pmpSource === 'purchases' ? 'PMP depuis achats' : 'PMP = catalogue'}>
                    {formatInDefault(line.pmpUnit)}
                    {line.pmpSource === 'catalog' && <span className="text-text-muted"> *</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">
                    {formatInDefault(line.valuePurchase)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">
                    {formatInDefault(line.valuePmp)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px]">
                    {formatInDefault(line.valueSale)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => void openHistory(line)}>
                      <History className="w-3.5 h-3.5 mr-1" />
                      Historique
                    </Button>
                  </td>
                </tr>
              ))}
              {sortedLines.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-text-muted">
                    Aucune ligne ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          * PMP unitaire issu du prix d’achat catalogue (aucune réception enregistrée pour ce produit).
        </p>
      </div>

      <Modal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyProductName ? `Mouvements — ${historyProductName}` : 'Historique'}
        size="lg"
      >
        {historyLoading ? (
          <p className="text-[13px] text-text-secondary">Chargement…</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-2">
            {historyMovements.length === 0 ? (
              <p className="text-[13px] text-text-muted">Aucun mouvement enregistré pour ce produit.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2 text-right">Qté</th>
                    <th className="py-2">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {historyMovements.map((m) => (
                    <tr key={m.id} className="border-b border-border-subtle/60">
                      <td className="py-2 pr-2 text-text-secondary whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="py-2 pr-2 text-text-primary">{MOVEMENT_LABELS[m.type] ?? m.type}</td>
                      <td className="py-2 pr-2 text-right font-mono">{m.quantity}</td>
                      <td className="py-2 text-text-secondary break-all">{m.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function KpiCard({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="rounded-[10px] border border-border-subtle p-4 flex gap-3"
      style={{ background: '#1E1E28' }}
    >
      <div className="text-text-muted opacity-80">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] text-text-muted uppercase tracking-wide">{title}</div>
        <div className="text-lg font-semibold text-text-primary truncate">{value}</div>
        <div className="text-[11px] text-text-muted mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}
