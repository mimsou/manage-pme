import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, Wallet, Building2, ChevronRight, Banknote, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  supplierCreditsApi,
  type SupplierPayableSummary,
  type SupplierPayableDetail,
  type UnpaidPurchaseRow,
} from '@/api/supplier-credits';
import { purchasesApi } from '@/api/purchases';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useAuthStore } from '@/stores/authStore';

function documentTypeLabel(t: string): string {
  switch (t) {
    case 'PURCHASE_ORDER':
      return 'BC';
    case 'DELIVERY_NOTE':
      return 'BL';
    case 'SUPPLIER_INVOICE':
      return 'Facture';
    default:
      return t;
  }
}

export default function SupplierCreditsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const supplierIdFromUrl = searchParams.get('supplierId');

  const [summaryList, setSummaryList] = useState<SupplierPayableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [minTotal, setMinTotal] = useState<string>('');
  const [maxTotal, setMaxTotal] = useState<string>('');
  const [overdueMinDays, setOverdueMinDays] = useState<string>('');

  const [detail, setDetail] = useState<SupplierPayableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState<UnpaidPurchaseRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const { currencyLabel } = useDefaultCurrency();
  const { user } = useAuthStore();
  const canRecordPayment = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await supplierCreditsApi.getSuppliersSummary({
        page,
        limit: 20,
        search: search || undefined,
        minTotal: minTotal !== '' ? parseFloat(minTotal) : undefined,
        maxTotal: maxTotal !== '' ? parseFloat(maxTotal) : undefined,
        overdueMinDays: overdueMinDays !== '' ? parseInt(overdueMinDays, 10) : undefined,
        supplierId: supplierIdFromUrl || undefined,
      });
      setSummaryList(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erreur chargement crédits fournisseurs',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [page, search, minTotal, maxTotal, overdueMinDays, supplierIdFromUrl]);

  useEffect(() => {
    if (supplierIdFromUrl) {
      setDetailLoading(true);
      supplierCreditsApi
        .getSupplierDetail(supplierIdFromUrl)
        .then(setDetail)
        .catch(() => toast.error('Erreur chargement détail fournisseur'))
        .finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [supplierIdFromUrl]);

  const openDetail = (supplierId: string) => {
    setSearchParams({ supplierId });
  };

  const closeDetail = () => {
    setSearchParams({});
    setDetail(null);
    setPaymentPurchase(null);
    setPaymentAmount('');
  };

  const openPaymentModal = (row: UnpaidPurchaseRow) => {
    setPaymentPurchase(row);
    setPaymentAmount(row.due.toFixed(2));
  };

  const handleRecordPayment = async () => {
    if (!paymentPurchase || !detail) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount > paymentPurchase.due) {
      toast.error('Le montant ne peut pas dépasser le restant dû.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await purchasesApi.recordPayment(paymentPurchase.id, { amount });
      toast.success('Règlement enregistré.');
      setPaymentPurchase(null);
      setPaymentAmount('');
      const updated = await supplierCreditsApi.getSupplierDetail(detail.supplier.id);
      setDetail(updated);
      loadSummary();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erreur enregistrement',
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const formatMoney = (value: number) => `${value.toFixed(2)} ${currencyLabel}`;

  const paymentProgress = (row: UnpaidPurchaseRow) => {
    if (row.total <= 0) return 0;
    return Math.min(100, Math.round((row.amountPaid / row.total) * 100));
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3">
          {detail ? (
            <button
              type="button"
              onClick={closeDetail}
              className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la liste
            </button>
          ) : (
            <>
              <h1 className="page-title">Crédits fournisseurs</h1>
              <Link
                to="/entries"
                className="text-[13px] text-text-secondary hover:text-brand transition-colors"
              >
                Entrées
              </Link>
              <Link
                to="/suppliers"
                className="text-[13px] text-text-secondary hover:text-brand transition-colors"
              >
                Fournisseurs
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="text-[12px] text-text-muted mb-4 max-w-2xl">
        Le solde dû correspond aux achats non soldés (total − payé). Le stock et le PMP suivent la{' '}
        <strong className="text-text-secondary">réception</strong> des marchandises sur la page Entrées.
      </p>

      {!detail ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Input
              placeholder="Rechercher fournisseur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<Search className="w-3.5 h-3.5" />}
              className="max-w-[220px]"
            />
            <Input
              placeholder="Impayés depuis (jours)"
              type="number"
              min={0}
              value={overdueMinDays}
              onChange={(e) => {
                setOverdueMinDays(e.target.value);
                setPage(1);
              }}
              className="w-40"
              title="Fournisseurs ayant au moins un achat impayé depuis X jours"
            />
            <Input
              placeholder="Montant min"
              type="number"
              value={minTotal}
              onChange={(e) => {
                setMinTotal(e.target.value);
                setPage(1);
              }}
              className="w-28"
            />
            <Input
              placeholder="Montant max"
              type="number"
              value={maxTotal}
              onChange={(e) => {
                setMaxTotal(e.target.value);
                setPage(1);
              }}
              className="w-28"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
          ) : summaryList.length === 0 ? (
            <div
              className="rounded-[10px] border flex flex-col items-center justify-center py-12"
              style={{ background: '#1E1E28', borderColor: '#2A2A38' }}
            >
              <Wallet className="w-9 h-9 mb-2" style={{ color: 'rgba(234,179,8,0.35)' }} />
              <p className="text-[12px] font-medium text-text-muted">Aucune dette fournisseur</p>
              <p className="text-[11px] text-text-muted mt-0.5">Les achats non soldés apparaîtront ici</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Solde dû</TableHead>
                    <TableHead>Documents ouverts</TableHead>
                    <TableHead> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryList.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-white/[0.03]"
                      onClick={() => openDetail(row.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-text-muted" />
                          <span className="text-text-primary font-medium">{row.name}</span>
                        </div>
                        {(row.email || row.phone) && (
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {[row.email, row.phone].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-warning">{formatMoney(row.totalDue)}</TableCell>
                      <TableCell className="text-text-secondary">{row.unpaidCount} achat(s)</TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Précédent
                  </Button>
                  <span className="text-[13px] text-text-secondary">
                    Page {page} sur {totalPages} ({total} fournisseur{total !== 1 ? 's' : ''})
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : null}

      {detailLoading && (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement du détail...</div>
      )}

      {detail && !detailLoading && (
        <div className="rounded-[10px] border overflow-hidden" style={{ background: '#1E1E28', borderColor: '#2A2A38' }}>
          <div className="p-4 border-b" style={{ borderColor: '#2A2A38' }}>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-text-muted" />
              <span className="font-semibold text-text-primary">{detail.supplier.name}</span>
            </div>
            {(detail.supplier.email || detail.supplier.phone || detail.supplier.city) && (
              <p className="text-[12px] text-text-muted">
                {[detail.supplier.email, detail.supplier.phone, detail.supplier.city].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="mt-2 text-[13px]">
              <span className="text-text-muted">Total restant dû : </span>
              <span className="font-semibold text-warning">{formatMoney(detail.totalDue)}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>BL / Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payé</TableHead>
                  <TableHead>Restant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Retard</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.unpaidPurchases.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-[12px]">{row.reference}</TableCell>
                    <TableCell className="text-text-secondary">{documentTypeLabel(row.documentType)}</TableCell>
                    <TableCell className="text-[12px] text-text-muted">
                      {[row.supplierDeliveryNoteNumber, row.invoiceNumber].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {format(new Date(row.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {row.dueDate ? format(new Date(row.dueDate), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell>{formatMoney(row.total)}</TableCell>
                    <TableCell className="text-text-muted">{formatMoney(row.amountPaid)}</TableCell>
                    <TableCell className="font-medium text-warning">{formatMoney(row.due)}</TableCell>
                    <TableCell>
                      <div
                        className="h-2 rounded-full bg-white/[0.06] overflow-hidden w-20"
                        title={`${paymentProgress(row)} %`}
                      >
                        <div
                          className="h-full bg-brand/80 rounded-full transition-all"
                          style={{ width: `${paymentProgress(row)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.daysOverdue != null && row.daysOverdue > 0 ? (
                        <span className="text-danger font-medium">{row.daysOverdue} j</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {canRecordPayment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openPaymentModal(row);
                          }}
                        >
                          <Banknote className="w-3.5 h-3.5 mr-1" />
                          Régler
                        </Button>
                      ) : (
                        <span className="text-[11px] text-text-muted">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!paymentPurchase}
        onClose={() => {
          setPaymentPurchase(null);
          setPaymentAmount('');
        }}
        title="Enregistrer un règlement fournisseur"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentPurchase(null);
                setPaymentAmount('');
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleRecordPayment} isLoading={paymentSubmitting}>
              Enregistrer
            </Button>
          </>
        }
      >
        {paymentPurchase && (
          <div className="space-y-4">
            <p className="text-[13px] text-text-secondary">
              Réf. {paymentPurchase.reference} · Restant dû :{' '}
              <strong className="text-text-primary">{formatMoney(paymentPurchase.due)}</strong>
            </p>
            <Input
              label="Montant du règlement"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={paymentPurchase.due.toFixed(2)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
