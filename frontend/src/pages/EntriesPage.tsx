import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Filter,
  Package,
  Truck,
  FileText,
  Printer,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ProductSelect } from '@/components/ui/ProductSelect';
import { purchasesApi } from '@/api/purchases';
import { suppliersApi } from '@/api/suppliers';
import {
  Purchase,
  PurchaseStatus,
  CreatePurchaseDto,
  ReceivePurchaseDto,
  PurchaseItem,
} from '@/types/purchase';
import { Supplier } from '@/types/supplier';
import { Product } from '@/types/product';
import { useAuthStore } from '@/stores/authStore';
import { generateBarcodeLabel, BarcodeLabelFormat } from '@/utils/barcode';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

const purchaseSchema = z.object({
  supplierId: z.string().uuid('Le fournisseur doit être valide'),
  reference: z.string().min(1, 'La référence est requise'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

const receiveItemSchema = z.object({
  itemId: z.string(),
  receivedQuantity: z.number().min(0, 'La quantité doit être positive'),
});

export default function EntriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; quantity: number; unitPrice: number }>
  >([]);
  const [receiveItems, setReceiveItems] = useState<
    Array<{ itemId: string; receivedQuantity: number }>
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    searchParams.get('supplierId') || ''
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { user } = useAuthStore();
  const { currencyLabel } = useDefaultCurrency();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreatePurchaseDto>({
    resolver: zodResolver(purchaseSchema),
  });

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, [page, searchTerm, selectedSupplierId, selectedStatus, startDate, endDate]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await purchasesApi.getAll({
        search: searchTerm || undefined,
        supplierId: selectedSupplierId || undefined,
        status: selectedStatus as PurchaseStatus | undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 20,
      });
      setPurchases(response.data);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des entrées');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getAll();
      setSuppliers(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des fournisseurs');
    }
  };


  const handleViewDetails = async (purchaseId: string) => {
    try {
      const purchase = await purchasesApi.getById(purchaseId);
      setSelectedPurchase(purchase);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const handleNew = () => {
    setPurchaseItems([]);
    reset({
      supplierId: selectedSupplierId || '',
      reference: `ENT-${Date.now()}`,
      invoiceNumber: '',
      invoiceDate: '',
      deliveryDate: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { productId: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'productId' | 'quantity' | 'unitPrice',
    value: string | number
  ) => {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseItems(updated);
  };

  const handleProductSelect = (index: number, product: Product) => {
    const updated = [...purchaseItems];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      unitPrice: product.purchasePrice,
    };
    setPurchaseItems(updated);
  };

  const onSubmit = async (data: CreatePurchaseDto) => {
    if (purchaseItems.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    try {
      await purchasesApi.create({
        ...data,
        items: purchaseItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      toast.success('Entrée créée avec succès');
      setIsModalOpen(false);
      reset();
      setPurchaseItems([]);
      loadPurchases();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleReceive = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setReceiveItems(
      purchase.items.map((item) => ({
        itemId: item.id,
        receivedQuantity: item.receivedQty,
      }))
    );
    setIsReceiveModalOpen(true);
  };

  const handleReceiveItemChange = (itemId: string, receivedQuantity: number) => {
    setReceiveItems(
      receiveItems.map((item) =>
        item.itemId === itemId ? { ...item, receivedQuantity } : item
      )
    );
  };

  const onSubmitReceive = async () => {
    if (!selectedPurchase) return;

    try {
      await purchasesApi.receive(selectedPurchase.id, {
        items: receiveItems,
      });
      toast.success('Réception enregistrée avec succès. Les stocks ont été mis à jour.');
      setIsReceiveModalOpen(false);
      setSelectedPurchase(null);
      setReceiveItems([]);
      loadPurchases();
      if (isDetailModalOpen) {
        handleViewDetails(selectedPurchase.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réception');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      await purchasesApi.delete(id);
      toast.success('Entrée supprimée avec succès');
      loadPurchases();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeLabelFormat>(
    BarcodeLabelFormat.STANDARD_50x30
  );
  const [isBarcodeFormatModalOpen, setIsBarcodeFormatModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);

  const handlePrintBarcode = (product: Product, quantity: number = 1) => {
    setSelectedProductForBarcode({ product, quantity });
    setIsBarcodeFormatModalOpen(true);
  };

  const confirmPrintBarcode = () => {
    if (!selectedProductForBarcode) return;
    try {
      generateBarcodeLabel(
        selectedProductForBarcode.product,
        selectedProductForBarcode.quantity,
        barcodeFormat,
        currencyLabel
      );
      toast.success('Étiquette générée avec succès');
      setIsBarcodeFormatModalOpen(false);
      setSelectedProductForBarcode(null);
    } catch (error) {
      toast.error('Erreur lors de la génération de l\'étiquette');
      console.error(error);
    }
  };

  const getStatusBadgeStyle = (status: PurchaseStatus): React.CSSProperties => {
    const styles: Record<PurchaseStatus, React.CSSProperties> = {
      [PurchaseStatus.PENDING]: {
        background: 'rgba(245,158,11,0.12)',
        color: '#F59E0B',
        border: '1px solid rgba(245,158,11,0.2)',
      },
      [PurchaseStatus.RECEIVED]: {
        background: 'rgba(16,185,129,0.12)',
        color: '#10B981',
        border: '1px solid rgba(16,185,129,0.2)',
      },
      [PurchaseStatus.PARTIAL]: {
        background: 'rgba(59,130,246,0.12)',
        color: '#3B82F6',
        border: '1px solid rgba(59,130,246,0.2)',
      },
      [PurchaseStatus.CANCELLED]: {
        background: 'rgba(239,68,68,0.12)',
        color: '#EF4444',
        border: '1px solid rgba(239,68,68,0.2)',
      },
      [PurchaseStatus.RETURNED]: {
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--color-text-secondary)',
        border: '1px solid #2A2A38',
      },
    };
    return {
      height: 20,
      padding: '0 8px',
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      ...(styles[status] || {}),
    };
  };

  const getStatusLabel = (status: PurchaseStatus) => {
    const labels = {
      [PurchaseStatus.PENDING]: 'En attente',
      [PurchaseStatus.RECEIVED]: 'Reçu',
      [PurchaseStatus.PARTIAL]: 'Partiel',
      [PurchaseStatus.CANCELLED]: 'Annulé',
      [PurchaseStatus.RETURNED]: 'Retourné',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: PurchaseStatus) => {
    switch (status) {
      case PurchaseStatus.RECEIVED:
        return <CheckCircle className="w-3 h-3 inline-block mr-0.5" />;
      case PurchaseStatus.PARTIAL:
        return <AlertCircle className="w-3 h-3 inline-block mr-0.5" />;
      case PurchaseStatus.CANCELLED:
        return <XCircle className="w-3 h-3 inline-block mr-0.5" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSupplierId('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = searchTerm || selectedSupplierId || selectedStatus || startDate || endDate;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Entrées de Stock</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="btn"
            onClick={() => setIsFilterModalOpen(true)}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1.5 bg-brand text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                Actifs
              </span>
            )}
          </Button>
          {isAdminOrManager && (
            <Button onClick={handleNew} className="btn">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nouvelle entrée
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : purchases.length === 0 ? (
        <div
          className="rounded-[10px] border flex flex-col items-center justify-center py-12 text-center"
          style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}
        >
          <Package className="w-9 h-9 text-text-muted mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucune entrée trouvée</p>
          <p className="text-[11px] text-text-muted mt-0.5">Créez une entrée ou ajustez les filtres</p>
        </div>
      ) : (
        <>
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono text-[12px] text-text-primary">{purchase.reference}</TableCell>
                      <TableCell>{purchase.supplier?.name || '-'}</TableCell>
                      <TableCell>{formatDate(purchase.createdAt)}</TableCell>
                      <TableCell>{purchase.invoiceNumber || '-'}</TableCell>
                      <TableCell className="font-mono text-text-primary text-right">{Number(purchase.totalAmount).toFixed(2)} {currencyLabel}</TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]"
                          style={getStatusBadgeStyle(purchase.status)}
                        >
                          {getStatusIcon(purchase.status)}
                          {getStatusLabel(purchase.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                            onClick={() => handleViewDetails(purchase.id)}
                            title="Voir les détails"
                          >
                            <Eye className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                          </button>
                          {isAdminOrManager &&
                            (purchase.status === PurchaseStatus.PENDING ||
                              purchase.status === PurchaseStatus.PARTIAL) && (
                              <button
                                type="button"
                                className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                                onClick={() => handleReceive(purchase)}
                                title="Réceptionner"
                              >
                                <CheckCircle className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          {user?.role === 'ADMIN' && purchase.status === PurchaseStatus.PENDING && (
                            <button
                              type="button"
                              className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                              onClick={() => handleDelete(purchase.id)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Précédent
              </Button>
              <span className="text-[13px] text-text-secondary">
                Page {page} sur {totalPages}
              </span>
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Suivant
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal Nouvelle entrée */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setPurchaseItems([]);
        }}
        title="Nouvelle entrée"
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setPurchaseItems([]);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
              Créer
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Fournisseur *
              </label>
              <select
                {...register('supplierId')}
                className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {errors.supplierId && (
                <p className="mt-1 text-sm text-danger">
                  {errors.supplierId.message}
                </p>
              )}
            </div>

            <Input
              label="Référence *"
              {...register('reference')}
              error={errors.reference?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="N° Facture"
              {...register('invoiceNumber')}
              error={errors.invoiceNumber?.message}
            />
            <Input
              label="Date facture"
              type="date"
              {...register('invoiceDate')}
              error={errors.invoiceDate?.message}
            />
            <Input
              label="Date livraison"
              type="date"
              {...register('deliveryDate')}
              error={errors.deliveryDate?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Produits</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter produit
              </Button>
            </div>

            {purchaseItems.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                Aucun produit ajouté. Cliquez sur "Ajouter produit" pour commencer.
              </p>
            ) : (
              <div className="space-y-3">
                {purchaseItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-elevated border-border-default"
                  >
                    <div className="col-span-5">
                      <ProductSelect
                        value={item.productId}
                        onChange={(productId) => handleItemChange(index, 'productId', productId)}
                        onProductSelect={(product) => handleProductSelect(index, product)}
                        placeholder="Rechercher un produit..."
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                        }
                        placeholder="Qté"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        placeholder="Prix unit."
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {(item.quantity * item.unitPrice).toFixed(2)} {currencyLabel}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {purchaseItems.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-text-secondary">Total:</div>
                    <div className="text-xl font-bold">
                      {purchaseItems
                        .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
                        .toFixed(2)}{' '}
                      {currencyLabel}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Réception */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedPurchase(null);
          setReceiveItems([]);
        }}
        title={`Réceptionner - ${selectedPurchase?.reference || ''}`}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsReceiveModalOpen(false);
                setSelectedPurchase(null);
                setReceiveItems([]);
              }}
            >
              Annuler
            </Button>
            <Button onClick={onSubmitReceive}>Enregistrer la réception</Button>
          </>
        }
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Indiquez les quantités reçues pour chaque produit. Les stocks seront automatiquement
              mis à jour.
            </p>

            <div className="space-y-3">
              {selectedPurchase.items.map((item) => {
                const receiveItem = receiveItems.find((ri) => ri.itemId === item.id);
                const receivedQty = receiveItem?.receivedQuantity || 0;
                const remaining = item.quantity - receivedQty;

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-elevated border-border-default"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{item.product?.name || 'Produit supprimé'}</div>
                        <div className="text-sm text-text-muted">
                          Commandé: {item.quantity} | Reçu: {item.receivedQty} | Restant:{' '}
                          {remaining}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={receivedQty}
                        onChange={(e) =>
                          handleReceiveItemChange(item.id, parseInt(e.target.value) || 0)
                        }
                        placeholder="Quantité reçue"
                        className="flex-1"
                      />
                      <span className="text-sm text-text-secondary">/ {item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Détails */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPurchase(null);
        }}
        title={`Détails - ${selectedPurchase?.reference || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Fermer
            </Button>
            {isAdminOrManager &&
              selectedPurchase &&
              (selectedPurchase.status === PurchaseStatus.PENDING ||
                selectedPurchase.status === PurchaseStatus.PARTIAL) && (
                <Button onClick={() => handleReceive(selectedPurchase)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Réceptionner
                </Button>
              )}
          </>
        }
      >
        {selectedPurchase && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-muted">Fournisseur</label>
                <p className="text-sm">{selectedPurchase.supplier?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Statut</label>
                <p className="text-sm">
                  <span
                    className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]"
                    style={getStatusBadgeStyle(selectedPurchase.status)}
                  >
                    {getStatusIcon(selectedPurchase.status)}
                    {getStatusLabel(selectedPurchase.status)}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Date</label>
                <p className="text-sm">{formatDate(selectedPurchase.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">N° Facture</label>
                <p className="text-sm">{selectedPurchase.invoiceNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Montant total</label>
                <p className="text-sm font-semibold">{Number(selectedPurchase.totalAmount).toFixed(2)} {currencyLabel}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-muted mb-2 block">Produits</label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Produit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Qté
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Reçu
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Prix unit.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">
                        Total
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-text-muted">
                        Code-barres
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border-default"
                      >
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium">
                            {item.product?.name || 'Produit supprimé'}
                          </div>
                          {item.product?.sku && (
                            <div className="text-xs text-text-muted">SKU: {item.product.sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{item.quantity}{item.product?.unit ? ` ${item.product.unit}` : ''}</td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={
                              item.receivedQty === item.quantity
                                ? 'text-success font-semibold'
                                : item.receivedQty > 0
                                ? 'text-info'
                                : 'text-text-muted'
                            }
                          >
                            {item.receivedQty}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{Number(item.unitPrice).toFixed(2)} {currencyLabel}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {Number(item.totalPrice).toFixed(2)} {currencyLabel}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintBarcode(item.product!, item.quantity)}
                              title="Imprimer code-barres"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedPurchase.notes && (
              <div>
                <label className="text-sm font-medium text-text-muted">Notes</label>
                <p className="text-sm">{selectedPurchase.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Filtres */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filtres"
        size="md"
        footer={
          <>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Réinitialiser
              </Button>
            )}
            <Button onClick={() => setIsFilterModalOpen(false)}>Appliquer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Recherche (référence, N° facture)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            icon={<Search className="w-4 h-4" />}
          />

          <Select
            label="Fournisseur"
            options={[
              { value: '', label: 'Tous les fournisseurs' },
              ...suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
              })),
            ]}
            value={selectedSupplierId}
            onChange={(e) => {
              setSelectedSupplierId(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="Statut"
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: PurchaseStatus.PENDING, label: 'En attente' },
              { value: PurchaseStatus.PARTIAL, label: 'Partiel' },
              { value: PurchaseStatus.RECEIVED, label: 'Reçu' },
              { value: PurchaseStatus.CANCELLED, label: 'Annulé' },
            ]}
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
            <Input
              label="Date de fin"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Format code-barres */}
      <Modal
        isOpen={isBarcodeFormatModalOpen}
        onClose={() => {
          setIsBarcodeFormatModalOpen(false);
          setSelectedProductForBarcode(null);
        }}
        title="Imprimer code-barres"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsBarcodeFormatModalOpen(false);
                setSelectedProductForBarcode(null);
              }}
            >
              Annuler
            </Button>
            <Button onClick={confirmPrintBarcode}>Imprimer</Button>
          </>
        }
      >
        {selectedProductForBarcode && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">
                Produit
              </label>
              <p className="text-sm">{selectedProductForBarcode.product.name}</p>
              <p className="text-xs text-text-muted">
                SKU: {selectedProductForBarcode.product.sku} | Quantité:{' '}
                {selectedProductForBarcode.quantity}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Format d'étiquette *
              </label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value as BarcodeLabelFormat)}
                className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
              >
                <option value={BarcodeLabelFormat.SMALL_40x25}>Petit (40x25mm)</option>
                <option value={BarcodeLabelFormat.STANDARD_50x30}>Standard (50x30mm)</option>
                <option value={BarcodeLabelFormat.LARGE_60x40}>Grand (60x40mm)</option>
                <option value={BarcodeLabelFormat.TICKET_80x50}>Ticket (80x50mm)</option>
              </select>
              <p className="mt-1 text-xs text-text-muted">
                Sélectionnez le format compatible avec votre imprimante code-barres
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

