import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Eye, X, Filter, Receipt, FileText, Printer, RotateCcw, Wallet, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { salesApi } from '@/api/sales';
import { clientsApi } from '@/api/clients';
import { Sale, SaleType, SaleStatus, PaymentMethod } from '@/types/sale';
import { Client } from '@/types/client';
import { useAuthStore } from '@/stores/authStore';
import { generateInvoice, generateTicket, generateAvoir, generateCreditRequest, type CompanyInfo } from '@/utils/pdf';
import { apiClient } from '@/api/client';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

function PaymentRecordBlock({
  sale,
  onRecorded,
  currencyLabel,
  toDefault,
}: {
  sale: Sale;
  onRecorded: () => void;
  currencyLabel: string;
  toDefault: (amount: number, currencyCode?: string | null) => number;
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const restant = Number(sale.total) - Number(sale.amountPaid ?? 0);

  const handleRecord = async () => {
    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setSubmitting(true);
    try {
      await salesApi.recordPayment(sale.id, amount);
      toast.success('Paiement enregistré. Vous pouvez réimprimer la facture avec le tampon « Payé ».');
      setPaymentAmount('');
      onRecorded();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <label className="text-sm font-medium text-text-muted mb-2 block">
        Enregistrer un paiement
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          type="number"
          step="0.01"
          min={0}
          max={restant}
          placeholder={`Max ${toDefault(restant, sale.currencyCode).toFixed(2)} ${currencyLabel}`}
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          className="w-32"
        />
        <Button size="sm" onClick={handleRecord} disabled={submitting}>
          {submitting ? 'Enregistrement...' : 'Valider le paiement'}
        </Button>
      </div>
    </div>
  );
}

export function SalesContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAvoirModalOpen, setIsAvoirModalOpen] = useState(false);
  const [avoirQuantities, setAvoirQuantities] = useState<Record<string, number>>({});
  const [avoirReason, setAvoirReason] = useState('');
  const [avoirSubmitting, setAvoirSubmitting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtres
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Infos société pour factures / tickets
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  const { user: _user } = useAuthStore();
  const { currencyLabel, toDefault } = useDefaultCurrency();

  useEffect(() => {
    loadSales();
  }, [page, startDate, endDate, selectedClientId, selectedType]);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    apiClient.get<CompanyInfo>('/company').then((r) => setCompany(r.data)).catch(() => {});
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 20,
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedClientId) params.clientId = selectedClientId;
      if (selectedType) params.type = selectedType;

      const response = await salesApi.getAll(params);
      setSales(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des ventes');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 1000 });
      setClients(response.data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des clients');
    }
  };

  const handleViewDetails = async (saleId: string) => {
    try {
      const sale = await salesApi.getById(saleId);
      setSelectedSale(sale);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des détails de la vente');
    }
  };

  const handleCancel = async (saleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette vente ? Le stock sera restauré.')) {
      return;
    }

    try {
      await salesApi.cancel(saleId);
      toast.success('Vente annulée avec succès');
      loadSales();
      if (selectedSale?.id === saleId) {
        setIsDetailModalOpen(false);
        setSelectedSale(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'annulation de la vente');
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<string, string> = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CARD]: 'Carte',
      [PaymentMethod.MIXED]: 'Mixte',
      [PaymentMethod.CREDIT]: 'À crédit',
    };
    return labels[method] ?? method;
  };

  const isCreditOrUnpaid = (sale: Sale) =>
    sale.client && (sale.paymentMethod === PaymentMethod.CREDIT || (Number(sale.amountPaid ?? 0) < Number(sale.total) - 0.01));

  const handlePrintCreditRequest = async (sale: Sale) => {
    try {
      await generateCreditRequest(sale, company);
      toast.success('Demande de crédit générée');
    } catch (error) {
      toast.error('Erreur lors de la génération du document');
    }
  };

  const getStatusBadgeStyle = (status: SaleStatus): React.CSSProperties => {
    const styles: Record<SaleStatus, React.CSSProperties> = {
      [SaleStatus.PENDING]: { background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' },
      [SaleStatus.COMPLETED]: { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' },
      [SaleStatus.CANCELLED]: { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' },
      [SaleStatus.REFUNDED]: { background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid #2A2A38' },
    };
    return { height: 20, padding: '0 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', ...(styles[status] || {}) };
  };

  const getStatusLabel = (status: SaleStatus) => {
    const labels = {
      [SaleStatus.PENDING]: 'En attente',
      [SaleStatus.COMPLETED]: 'Terminée',
      [SaleStatus.CANCELLED]: 'Annulée',
      [SaleStatus.REFUNDED]: 'Remboursée',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return '-';
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedClientId('');
    setSelectedType('');
    setPage(1);
  };

  const hasActiveFilters = startDate || endDate || selectedClientId || selectedType;

  const handlePrint = async (sale: Sale) => {
    try {
      if (sale.type === SaleType.INVOICE) {
        await generateInvoice(sale, company);
      } else {
        await generateTicket(sale, company);
      }
      toast.success('Document généré avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération du document');
      console.error(error);
    }
  };

  const openAvoirModal = () => {
    if (!selectedSale) return;
    const qty: Record<string, number> = {};
    selectedSale.items.forEach((item) => {
      qty[item.id] = item.quantity;
    });
    setAvoirQuantities(qty);
    setAvoirReason('');
    setIsAvoirModalOpen(true);
  };

  const handleCreateAvoir = async () => {
    if (!selectedSale) return;
    const items = Object.entries(avoirQuantities)
      .filter(([, q]) => q > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    if (items.length === 0) {
      toast.error('Indiquez au moins une quantité à rembourser.');
      return;
    }
    setAvoirSubmitting(true);
    try {
      const refund = await salesApi.createRefund(selectedSale.id, {
        items,
        reason: avoirReason || undefined,
      });
      const saleWithRefund = await salesApi.getById(selectedSale.id);
      await generateAvoir(refund, saleWithRefund, company);
      toast.success('Avoir créé. Le stock a été mis à jour. Document imprimé.');
      setIsAvoirModalOpen(false);
      setSelectedSale(saleWithRefund);
      loadSales();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création de l\'avoir.');
    } finally {
      setAvoirSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Ventes</h1>
        <div className="flex items-center gap-2">
          <Link to="/credits">
            <Button variant="outline" className="btn">
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Crédits clients
            </Button>
          </Link>
          <Button variant="outline" className="btn" onClick={() => setIsFilterModalOpen(true)}>
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1.5 bg-brand text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase">Actifs</span>
          )}
        </Button>
        </div>
      </div>

      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
        style={{ gap: 12 }}
      >
        <div className="rounded-[10px] border p-3" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Total ventes</div>
          <div className="text-[24px] font-bold font-mono text-text-primary mt-0.5">{total}</div>
        </div>
        <div className="rounded-[10px] border p-3" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-muted">CA Total</div>
          <div className="text-[24px] font-bold font-mono text-text-primary mt-0.5">
            {sales.reduce((sum, sale) => sum + toDefault(Number(sale.total), sale.currencyCode), 0).toFixed(2)} {currencyLabel}
          </div>
        </div>
        <div className="rounded-[10px] border p-3" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Marge Totale</div>
          <div className="text-[24px] font-bold font-mono text-text-primary mt-0.5">
            {sales.reduce((sum, sale) => sum + toDefault(sale.margin || 0, sale.currencyCode), 0).toFixed(2)} {currencyLabel}
          </div>
        </div>
        <div className="rounded-[10px] border p-3" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <div className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Panier moyen</div>
          <div className="text-[24px] font-bold font-mono text-text-primary mt-0.5">
            {sales.length > 0
              ? (sales.reduce((sum, sale) => sum + toDefault(Number(sale.total), sale.currencyCode), 0) / sales.length).toFixed(2)
              : '0.00'}{' '}
            {currencyLabel}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : sales.length === 0 ? (
        <div className="rounded-[10px] border flex flex-col items-center justify-center py-12" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <Receipt className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucune vente trouvée</p>
          <p className="text-[11px] text-text-muted mt-0.5">Ajustez les filtres ou enregistrez une vente au POS</p>
        </div>
      ) : (
        <>
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Ticket/Facture</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Marge</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {formatDate(sale.createdAt)}
                      </TableCell>
                      <TableCell>
                        {sale.ticketNumber || sale.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {sale.type === SaleType.TICKET ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          {sale.type === SaleType.TICKET ? 'Ticket' : 'Facture'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sale.client
                          ? sale.client.companyName ||
                            `${sale.client.firstName || ''} ${sale.client.lastName || ''}`.trim() ||
                            'Client sans nom'
                          : 'Particulier'}
                      </TableCell>
                      <TableCell>
                        {sale.user
                          ? `${sale.user.firstName} ${sale.user.lastName}`
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-text-primary text-right">{toDefault(Number(sale.total), sale.currencyCode).toFixed(2)} {currencyLabel}</TableCell>
                      <TableCell className={`font-mono text-right ${(sale.margin ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {toDefault(sale.margin || 0, sale.currencyCode).toFixed(2)} {currencyLabel}
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(sale.paymentMethod)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]" style={getStatusBadgeStyle(sale.status)}>
                          {getStatusLabel(sale.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                            onClick={() => handleViewDetails(sale.id)}
                            title="Voir les détails"
                          >
                            <Eye className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            type="button"
                            className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                            onClick={() => handlePrint(sale)}
                            title={`Imprimer ${sale.type === SaleType.INVOICE ? 'Facture' : 'Ticket'}`}
                          >
                            <Printer className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                          </button>
                          {isCreditOrUnpaid(sale) && (
                            <button
                              type="button"
                              className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                              onClick={() => handlePrintCreditRequest(sale)}
                              title="Imprimer demande de crédit"
                            >
                              <FileSignature className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                          {sale.status === SaleStatus.COMPLETED && (
                            <button
                              type="button"
                              className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                              onClick={() => handleCancel(sale.id)}
                              title="Annuler la vente"
                            >
                              <X className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
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
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</Button>
              <span className="text-[13px] text-text-secondary">Page {page} sur {totalPages}</span>
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</Button>
            </div>
          )}
        </>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Date de fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Select
            label="Client"
            options={[
              { value: '', label: 'Tous les clients' },
              ...clients.map((client) => ({
                value: client.id,
                label:
                  client.companyName ||
                  `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                  client.email ||
                  'Client sans nom',
              })),
            ]}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          />

          <Select
            label="Type de vente"
            options={[
              { value: '', label: 'Tous les types' },
              { value: SaleType.TICKET, label: 'Ticket (B2C)' },
              { value: SaleType.INVOICE, label: 'Facture (B2B)' },
            ]}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          />
        </div>
      </Modal>

      {/* Modal Détails */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSale(null);
        }}
        title={`Détails de la vente ${selectedSale?.ticketNumber || selectedSale?.invoiceNumber || selectedSale?.id}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Fermer
            </Button>
            {selectedSale && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handlePrint(selectedSale)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer {selectedSale.type === SaleType.INVOICE ? 'Facture' : 'Ticket'}
                </Button>
                {isCreditOrUnpaid(selectedSale) && (
                  <Button variant="outline" onClick={() => handlePrintCreditRequest(selectedSale)}>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Demande de crédit
                  </Button>
                )}
              </>
            )}
            {selectedSale?.status === SaleStatus.COMPLETED && (
              <>
                <Button variant="outline" onClick={openAvoirModal}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Créer un avoir
                </Button>
                <Button
                  variant="danger"
                  onClick={() => selectedSale && handleCancel(selectedSale.id)}
                >
                  Annuler la vente
                </Button>
              </>
            )}
          </>
        }
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-muted">Date</label>
                <p className="text-sm">
                  {formatDate(selectedSale.createdAt)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Type</label>
                <p className="text-sm">
                  {selectedSale.type === SaleType.TICKET ? 'Ticket (B2C)' : 'Facture (B2B)'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Statut</label>
                <p className="text-sm">
                  <span
                    className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]"
                    style={getStatusBadgeStyle(selectedSale.status)}
                  >
                    {getStatusLabel(selectedSale.status)}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted">Paiement</label>
                <p className="text-sm">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
              </div>
            </div>

            {/* Client */}
            {selectedSale.client && (
              <div>
                <label className="text-sm font-medium text-text-muted">Client</label>
                <p className="text-sm">
                  {selectedSale.client.companyName ||
                    `${selectedSale.client.firstName || ''} ${selectedSale.client.lastName || ''}`.trim() ||
                    selectedSale.client.email ||
                    'Client sans nom'}
                </p>
                {selectedSale.client.phone && (
                  <p className="text-xs text-text-muted">Tél: {selectedSale.client.phone}</p>
                )}
              </div>
            )}

            {/* Vendeur */}
            {selectedSale.user && (
              <div>
                <label className="text-sm font-medium text-text-muted">Vendeur</label>
                <p className="text-sm">
                  {selectedSale.user.firstName} {selectedSale.user.lastName}
                </p>
              </div>
            )}

            {/* Articles */}
            <div>
              <label className="text-sm font-medium text-text-muted mb-2 block">Articles</label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Produit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Qté</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Prix unit.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                        Remise
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item) => (
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
                        <td className="px-4 py-2 text-sm">{selectedSale ? toDefault(Number(item.unitPrice), selectedSale.currencyCode).toFixed(2) : item.unitPrice.toFixed(2)} {currencyLabel}</td>
                        <td className="px-4 py-2 text-sm">{selectedSale ? toDefault(Number(item.discount), selectedSale.currencyCode).toFixed(2) : item.discount.toFixed(2)} {currencyLabel}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {selectedSale ? toDefault(Number(item.totalPrice), selectedSale.currencyCode).toFixed(2) : item.totalPrice.toFixed(2)} {currencyLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux (affichés en devise par défaut) */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{toDefault(Number(selectedSale.subtotal), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Remise:</span>
                  <span className="text-danger">-{toDefault(Number(selectedSale.discount), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>TVA (20%):</span>
                  <span>{toDefault(Number(selectedSale.tax), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{toDefault(Number(selectedSale.total), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Marge brute:</span>
                <span className={(selectedSale.margin ?? 0) >= 0 ? 'text-success' : 'text-danger'}>
                  {toDefault(selectedSale.margin || 0, selectedSale.currencyCode).toFixed(2)} {currencyLabel}
                </span>
              </div>
            </div>

            {/* Paiement */}
            {(selectedSale.cashAmount || selectedSale.cardAmount || selectedSale.paymentMethod === PaymentMethod.CREDIT) && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-text-muted mb-2 block">
                  Détails du paiement
                </label>
                <div className="space-y-1 text-sm">
                  {Number(selectedSale.amountPaid ?? 0) >= 0 && (
                    <div className="flex justify-between">
                      <span>Montant payé:</span>
                      <span>{toDefault(Number(selectedSale.amountPaid ?? 0), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
                    </div>
                  )}
                  {Number(selectedSale.amountPaid ?? 0) < Number(selectedSale.total) - 0.01 && (
                    <div className="flex justify-between">
                      <span>Restant dû:</span>
                      <span className="text-amber-500 font-medium">
                        {toDefault(Number(selectedSale.total) - Number(selectedSale.amountPaid ?? 0), selectedSale.currencyCode).toFixed(2)} {currencyLabel}
                      </span>
                    </div>
                  )}
                  {selectedSale.cashAmount && (
                    <div className="flex justify-between">
                      <span>Espèces:</span>
                      <span>{toDefault(Number(selectedSale.cashAmount), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
                    </div>
                  )}
                  {selectedSale.cardAmount && (
                    <div className="flex justify-between">
                      <span>Carte:</span>
                      <span>{toDefault(Number(selectedSale.cardAmount), selectedSale.currencyCode).toFixed(2)} {currencyLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enregistrer un paiement (vente à crédit / impayée) */}
            {selectedSale.status === SaleStatus.COMPLETED && Number(selectedSale.amountPaid ?? 0) < Number(selectedSale.total) - 0.01 && (
              <PaymentRecordBlock
                sale={selectedSale}
                onRecorded={async () => {
                  const updated = await salesApi.getById(selectedSale.id);
                  setSelectedSale(updated);
                  loadSales();
                }}
                currencyLabel={currencyLabel}
                toDefault={toDefault}
              />
            )}

            {/* Historique des avoirs */}
            {selectedSale.refunds && selectedSale.refunds.length > 0 && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-text-muted mb-2 block">
                  Historique des avoirs
                </label>
                <div className="space-y-2">
                  {selectedSale.refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg border border-border-subtle text-[13px]"
                      style={{ background: '#1E1E28' }}
                    >
                      <div>
                        <span className="font-mono font-medium text-text-primary">
                          {refund.avoirNumber || `Avoir #${refund.id.slice(0, 8)}`}
                        </span>
                        <span className="text-text-muted ml-2">
                          {formatDate(refund.createdAt)}
                        </span>
                        <span className="ml-2 font-mono">
                          {selectedSale ? toDefault(Number(refund.refundAmount), selectedSale.currencyCode).toFixed(2) : Number(refund.refundAmount).toFixed(2)} {currencyLabel}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="btn"
                        onClick={async () => {
                          try {
                            await generateAvoir(refund, selectedSale, company);
                            toast.success('Avoir imprimé');
                          } catch (e) {
                            toast.error('Erreur lors de l\'impression');
                          }
                        }}
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Imprimer
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Créer un avoir */}
      <Modal
        isOpen={isAvoirModalOpen}
        onClose={() => setIsAvoirModalOpen(false)}
        title="Créer un avoir (note de crédit)"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAvoirModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateAvoir} disabled={avoirSubmitting}>
              {avoirSubmitting ? 'Création...' : 'Créer l\'avoir et imprimer'}
            </Button>
          </>
        }
      >
        {selectedSale && (
          <div className="space-y-4">
            <p className="text-[13px] text-text-secondary">
              Choisissez les quantités à rembourser. Le stock sera mis à jour et un document avoir sera généré (traçabilité, normes tunisiennes).
            </p>
            <div>
              <label className="label-caption block mb-2">Motif (optionnel)</label>
              <input
                type="text"
                value={avoirReason}
                onChange={(e) => setAvoirReason(e.target.value)}
                placeholder="Ex: retour marchandise, erreur de facturation"
                className="input w-full"
              />
            </div>
            <div className="border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead style={{ background: '#252532' }}>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">Produit</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-muted">Qté max</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-muted">Qté avoir</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item) => (
                    <tr key={item.id} className="border-t border-border-subtle">
                      <td className="px-3 py-2">{item.product?.name || 'Produit'}</td>
                      <td className="px-3 py-2 text-right font-mono">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={avoirQuantities[item.id] ?? 0}
                          onChange={(e) =>
                            setAvoirQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, Math.min(item.quantity, parseInt(e.target.value, 10) || 0)),
                            }))
                          }
                          className="input w-16 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SalesPage() {
  return <SalesContent />;
}
