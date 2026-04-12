import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Barcode,
  Minus,
  Package,
  Plus,
  Search,
  Eye,
  EyeOff,
  Play,
  CheckCircle,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { inventoryApi } from '@/api/inventory';
import { productsApi } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { useAuthStore } from '@/stores/authStore';
import type { Inventory, InventoryItem, InventoryStatus } from '@/types/inventory';
import type { Category, Product, ProductVariant } from '@/types/product';

const statusLabel: Record<InventoryStatus, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  VALIDATED: 'Validé',
};

function getTheoretical(product: Product, variant: ProductVariant | null): number {
  if (variant) return variant.stockCurrent;
  return product.stockCurrent;
}

export default function InventorySessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [selection, setSelection] = useState<{
    product: Product;
    variant: ProductVariant | null;
  } | null>(null);
  const [countedQty, setCountedQty] = useState(0);
  const [lineReason, setLineReason] = useState('');
  const [showTheoretical, setShowTheoretical] = useState(true);

  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadInventory = useCallback(async () => {
    if (!id) return;
    try {
      const data = await inventoryApi.getById(id);
      setInventory(data);
    } catch {
      toast.error('Inventaire introuvable');
      setInventory(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    (async () => {
      try {
        const [prodRes, cats] = await Promise.all([
          productsApi.getAll({ limit: 2000 }),
          categoriesApi.getAll(),
        ]);
        setProducts(prodRes.data);
        setCategories(cats);
      } catch {
        toast.error('Erreur chargement produits');
      }
    })();
  }, []);

  useEffect(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(searchTerm)),
      );
    }
    if (selectedCategory) {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    setFilteredProducts(list);
  }, [products, searchTerm, selectedCategory]);

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  const applyResolved = (product: Product, variant: ProductVariant | null) => {
    setSelection({ product, variant });
    const t = getTheoretical(product, variant);
    setCountedQty(t);
    setLineReason('');
    setTimeout(() => qtyInputRef.current?.focus(), 50);
    setVariantModalProduct(null);
  };

  const handleResolvedScan = async (barcode: string) => {
    try {
      const res = await productsApi.resolveBarcode(barcode.trim());
      if (res.resolvedAs === 'variant' && res.variant) {
        applyResolved(res.product, res.variant);
        toast.success(`${res.product.name} — ${res.variant.sku}`);
        return;
      }
      const p = res.product;
      if (p.variants && p.variants.length > 0) {
        setVariantModalProduct(p);
        toast('Choisissez la variante dans la liste.');
        return;
      }
      applyResolved(p, null);
      toast.success(p.name);
    } catch {
      toast.error('Code non reconnu');
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const scanner = new Html5Qrcode('inventory-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          void handleResolvedScan(decodedText);
          stopScanning();
        },
        () => {},
      );
    } catch {
      toast.error('Impossible de démarrer la caméra');
      setIsScanning(false);
    }
  };

  const submitLine = async () => {
    if (!id || !inventory || !selection) return;
    if (inventory.status !== 'IN_PROGRESS') {
      toast.error('Démarrez l’inventaire pour enregistrer des lignes.');
      return;
    }
    const { product, variant } = selection;
    const theoretical = getTheoretical(product, variant);
    const diff = countedQty - theoretical;
    try {
      await inventoryApi.addItem(id, {
        productId: product.id,
        productVariantId: variant?.id,
        countedQty,
        reason: diff !== 0 && lineReason.trim() ? lineReason.trim() : undefined,
      });
      toast.success('Ligne enregistrée');
      setSelection(null);
      setLineReason('');
      await loadInventory();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Erreur lors de l’enregistrement');
    }
  };

  const updateLineLocal = async (item: InventoryItem, nextQty: number, reason?: string) => {
    if (!id || !inventory) return;
    if (inventory.status !== 'IN_PROGRESS') return;
    try {
      await inventoryApi.updateItem(id, item.id, {
        countedQty: nextQty,
        reason: reason !== undefined ? reason : item.reason || undefined,
      });
      toast.success('Ligne mise à jour');
      await loadInventory();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Erreur');
    }
  };

  const onStart = async () => {
    if (!id) return;
    try {
      await inventoryApi.start(id);
      toast.success('Inventaire démarré');
      await loadInventory();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Erreur');
    }
  };

  const onComplete = async () => {
    if (!id) return;
    try {
      await inventoryApi.complete(id);
      toast.success('Comptage terminé');
      setConfirmCompleteOpen(false);
      await loadInventory();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Erreur (réservé Admin / Manager ?)');
    }
  };

  const onValidate = async () => {
    if (!id) return;
    try {
      await inventoryApi.validate(id);
      toast.success('Stocks ajustés');
      setConfirmValidateOpen(false);
      await loadInventory();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Erreur');
    }
  };

  const onDelete = async () => {
    if (!id || !inventory) return;
    try {
      setDeleting(true);
      await inventoryApi.delete(id);
      toast.success('Inventaire supprimé');
      setConfirmDeleteOpen(false);
      navigate('/inventory');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Suppression impossible');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !id) {
    return <p className="text-[13px] text-text-secondary">Chargement…</p>;
  }

  if (!inventory) {
    return (
      <div>
        <Link to="/inventory" className="text-[13px] text-brand hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <p className="text-text-secondary">Inventaire introuvable.</p>
      </div>
    );
  }

  /** Comptage (scan, lignes) uniquement après « Démarrer » → statut en cours */
  const canEdit = inventory.status === 'IN_PROGRESS';
  const theoreticalSel = selection ? getTheoretical(selection.product, selection.variant) : 0;
  const diffPreview = selection ? countedQty - theoreticalSel : 0;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link
            to="/inventory"
            className="text-[13px] text-brand hover:underline inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Liste des inventaires
          </Link>
          <h1 className="page-title" style={{ marginBottom: 6 }}>
            {inventory.reference}
          </h1>
          <p className="text-[13px] text-text-secondary">
            {statusLabel[inventory.status]} ·{' '}
            {inventory.user && (
              <>
                {inventory.user.firstName} {inventory.user.lastName}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inventory.status === 'DRAFT' && (
            <Button variant="primary" onClick={onStart}>
              <Play className="w-4 h-4 mr-1.5" />
              Démarrer
            </Button>
          )}
          {inventory.status === 'IN_PROGRESS' && isAdminOrManager && (
            <Button variant="secondary" onClick={() => setConfirmCompleteOpen(true)}>
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Terminer le comptage
            </Button>
          )}
          {inventory.status === 'COMPLETED' && isAdminOrManager && (
            <Button variant="primary" onClick={() => setConfirmValidateOpen(true)}>
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Valider et ajuster les stocks
            </Button>
          )}
          {isAdminOrManager && inventory.status !== 'VALIDATED' && (
            <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)} title="Supprimer cet inventaire">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {inventory.status === 'DRAFT' && (
        <div
          className="mb-4 p-4 rounded-[10px] border border-brand/30 bg-brand/10 text-[13px] text-text-primary"
          role="status"
        >
          <strong className="font-semibold">Étape requise :</strong> appuyez sur « Démarrer » pour activer le comptage
          (scan, recherche et saisie des quantités).
        </div>
      )}

      {isScanning && (
        <div className="mb-4 p-4 rounded-[10px] border border-border-subtle bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-text-secondary">Scannez un code-barres</span>
            <Button variant="danger" size="sm" onClick={stopScanning}>
              <X className="w-4 h-4 mr-1" />
              Fermer
            </Button>
          </div>
          <div id="inventory-reader" className="max-w-xs" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Rechercher nom, SKU, code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-8 h-9 text-[13px]"
                disabled={!canEdit}
              />
            </div>
            <div className="w-[200px]">
              <Select
                options={[
                  { value: '', label: 'Toutes catégories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input h-9 text-[13px] w-full"
                disabled={!canEdit}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={startScanning} disabled={!canEdit || isScanning}>
              <Barcode className="w-4 h-4 mr-1.5" />
              Scanner
            </Button>
            <button
              type="button"
              onClick={() => setShowTheoretical((v) => !v)}
              disabled={!canEdit}
              className="h-9 px-3 rounded-md border border-[#2A2A38] text-[12px] text-text-secondary hover:bg-white/[0.04] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Masquer le stock théorique pendant la saisie (réduit le biais)"
            >
              {showTheoretical ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Théorique
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  if (p.variants && p.variants.length > 0) {
                    setVariantModalProduct(p);
                  } else {
                    applyResolved(p, null);
                  }
                }}
                className="text-left rounded-[10px] border border-[#2A2A38] p-3 transition hover:border-[rgba(99,102,241,0.4)] disabled:opacity-40"
                style={{ background: '#1E1E28' }}
              >
                <div className="flex items-center justify-center rounded-md mb-2 h-14 bg-white/[0.04]">
                  <Package className="w-7 h-7 text-text-muted" />
                </div>
                <div className="text-[12px] font-medium text-text-primary line-clamp-2 leading-snug">{p.name}</div>
                <div className="text-[11px] text-text-muted font-mono mt-1">{p.sku}</div>
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-[10px] border border-border-subtle p-4 xl:sticky xl:top-4 h-fit"
          style={{ background: '#1E1E28' }}
        >
          <h2 className="text-[14px] font-semibold text-text-primary mb-3">Saisie quantité</h2>
          {!selection ? (
            <p className="text-[13px] text-text-secondary">
              {inventory.status === 'DRAFT'
                ? 'Cliquez d’abord sur « Démarrer » en haut de page, puis vous pourrez sélectionner ou scanner des articles.'
                : 'Sélectionnez un produit ou scannez un code-barres.'}
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[13px] font-medium text-text-primary">{selection.product.name}</div>
                {selection.variant && (
                  <div className="text-[12px] text-text-secondary mt-1">
                    {selection.variant.name}: {selection.variant.value} · {selection.variant.sku}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-text-secondary">Stock théorique</span>
                <span className="font-mono text-text-primary">
                  {showTheoretical ? theoreticalSel : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="!h-12 !w-12 !p-0 shrink-0"
                  onClick={() => setCountedQty((q) => Math.max(0, q - 1))}
                  disabled={!canEdit}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <Input
                  ref={qtyInputRef}
                  type="number"
                  min={0}
                  value={countedQty}
                  onChange={(e) => setCountedQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="text-center text-lg font-semibold h-12"
                  disabled={!canEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitLine();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="!h-12 !w-12 !p-0 shrink-0"
                  onClick={() => setCountedQty((q) => q + 1)}
                  disabled={!canEdit}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              {showTheoretical && (
                <div
                  className={`text-[12px] rounded-md px-2 py-1.5 ${
                    diffPreview === 0 ? 'bg-white/[0.04] text-text-secondary' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  Écart : {diffPreview > 0 ? '+' : ''}
                  {diffPreview}
                </div>
              )}
              {showTheoretical && diffPreview !== 0 && (
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Motif (recommandé)</label>
                  <Input
                    value={lineReason}
                    onChange={(e) => setLineReason(e.target.value)}
                    placeholder="Ex. casse, erreur réception…"
                    disabled={!canEdit}
                  />
                </div>
              )}
              <Button variant="primary" className="w-full h-11" onClick={() => void submitLine()} disabled={!canEdit}>
                Enregistrer la ligne (Entrée)
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">Lignes comptées ({inventory.items?.length ?? 0})</h2>
        <div className="overflow-x-auto rounded-[10px] border border-border-subtle" style={{ background: '#1E1E28' }}>
          <table className="w-full text-[13px]">
            <thead style={{ background: '#252532' }}>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Produit</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Théorique</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Compté</th>
                <th className="text-right px-3 py-2 font-medium text-text-secondary">Écart</th>
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Motif</th>
                {canEdit ? <th className="w-28"></th> : null}
              </tr>
            </thead>
            <tbody>
              {(inventory.items || []).map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onSave={(qty, reason) => void updateLineLocal(item, qty, reason)}
                />
              ))}
              {(!inventory.items || inventory.items.length === 0) && (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-3 py-8 text-center text-text-muted text-[13px]"
                  >
                    Aucune ligne pour cet inventaire.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!variantModalProduct}
        onClose={() => setVariantModalProduct(null)}
        title="Choisir une variante"
        footer={
          <Button variant="outline" onClick={() => setVariantModalProduct(null)}>
            Annuler
          </Button>
        }
      >
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {variantModalProduct?.variants?.map((v) => (
            <button
              key={v.id}
              type="button"
              className="w-full text-left p-3 rounded-lg border border-border-subtle hover:border-brand/50 transition"
              style={{ background: '#252532' }}
              onClick={() => {
                applyResolved(variantModalProduct, v);
              }}
            >
              <div className="text-[13px] font-medium text-text-primary">{v.name}</div>
              <div className="text-[12px] text-text-secondary font-mono">{v.sku} · stock {v.stockCurrent}</div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        title="Terminer le comptage ?"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmCompleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={() => void onComplete()}>
              Confirmer
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-text-secondary">
          Vous ne pourrez plus ajouter ni modifier de lignes. Seuls un administrateur ou un manager pourront valider
          l’ajustement des stocks.
        </p>
      </Modal>

      <Modal
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        title="Valider l’inventaire ?"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmValidateOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={() => void onValidate()}>
              Valider
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-text-secondary">
          Les stocks seront mis à jour selon les quantités comptées et des mouvements d’inventaire seront créés pour les
          écarts. Cette action est définitive.
        </p>
      </Modal>

      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        title="Supprimer cet inventaire ?"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={() => void onDelete()} isLoading={deleting}>
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-text-secondary">
          {inventory.reference} et toutes ses lignes seront supprimés. Impossible si l’inventaire était déjà validé
          (bouton masqué dans ce cas).
        </p>
      </Modal>
    </div>
  );
}

function InventoryRow({
  item,
  canEdit,
  onSave,
}: {
  item: InventoryItem;
  canEdit: boolean;
  onSave: (qty: number, reason?: string) => void;
}) {
  const [qty, setQty] = useState(item.countedQty);
  const [reason, setReason] = useState(item.reason || '');
  useEffect(() => {
    setQty(item.countedQty);
    setReason(item.reason || '');
  }, [item.countedQty, item.reason]);

  const diff = qty - item.theoreticalQty;

  return (
    <tr className="border-b border-border-subtle/80">
      <td className="px-3 py-2 align-top">
        <div className="text-text-primary">{item.product.name}</div>
        {item.productVariant && (
          <div className="text-[11px] text-text-muted font-mono">{item.productVariant.sku}</div>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono text-text-secondary">{item.theoreticalQty}</td>
      <td className="px-3 py-2 text-right">
        {canEdit ? (
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="input w-20 text-right h-8 text-[13px] py-0"
          />
        ) : (
          <span className="font-mono">{item.countedQty}</span>
        )}
      </td>
      <td
        className={`px-3 py-2 text-right font-mono ${
          diff === 0 ? 'text-text-secondary' : 'text-amber-400'
        }`}
      >
        {diff > 0 ? '+' : ''}
        {canEdit ? diff : item.difference}
      </td>
      <td className="px-3 py-2 align-top">
        {canEdit ? (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input w-full h-8 text-[12px] py-0"
            placeholder="—"
          />
        ) : (
          <span className="text-text-secondary text-[12px]">{item.reason || '—'}</span>
        )}
      </td>
      {canEdit && (
        <td className="px-3 py-2">
          <Button variant="outline" size="sm" onClick={() => onSave(qty, reason)}>
            MAJ
          </Button>
        </td>
      )}
    </tr>
  );
}
