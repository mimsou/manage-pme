import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Search,
  Wallet,
  User,
  Building2,
  ChevronRight,
  Receipt,
  FileText,
  Banknote,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { creditsApi, type ClientCreditSummary, type ClientCreditDetail, type UnpaidSaleRow } from '@/api/credits';
import { salesApi } from '@/api/sales';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

function getClientDisplayName(row: ClientCreditSummary): string {
  if (row.companyName) return row.companyName;
  return [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Client sans nom';
}

export default function CreditsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get('clientId');

  const [summaryList, setSummaryList] = useState<ClientCreditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [minTotal, setMinTotal] = useState<string>('');
  const [maxTotal, setMaxTotal] = useState<string>('');
  const [overdueMinDays, setOverdueMinDays] = useState<string>('');

  const [detail, setDetail] = useState<ClientCreditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentSale, setPaymentSale] = useState<UnpaidSaleRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const { currencyLabel } = useDefaultCurrency();

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await creditsApi.getClientCreditsSummary({
        page,
        limit: 20,
        search: search || undefined,
        minTotal: minTotal !== '' ? parseFloat(minTotal) : undefined,
        maxTotal: maxTotal !== '' ? parseFloat(maxTotal) : undefined,
        overdueMinDays: overdueMinDays !== '' ? parseInt(overdueMinDays, 10) : undefined,
        clientId: clientIdFromUrl || undefined,
      });
      setSummaryList(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur chargement crédits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [page, search, minTotal, maxTotal, overdueMinDays, clientIdFromUrl]);

  useEffect(() => {
    if (clientIdFromUrl) {
      setDetailLoading(true);
      creditsApi
        .getClientCreditDetail(clientIdFromUrl)
        .then(setDetail)
        .catch(() => toast.error('Erreur chargement détail client'))
        .finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [clientIdFromUrl]);

  const openDetail = (clientId: string) => {
    setSearchParams({ clientId });
  };

  const closeDetail = () => {
    setSearchParams({});
    setDetail(null);
    setPaymentSale(null);
    setPaymentAmount('');
  };

  const openPaymentModal = (sale: UnpaidSaleRow) => {
    setPaymentSale(sale);
    setPaymentAmount(sale.due.toFixed(2));
  };

  const handleRecordPayment = async () => {
    if (!paymentSale || !detail) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount > paymentSale.due) {
      toast.error('Le montant ne peut pas dépasser le restant dû.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await salesApi.recordPayment(paymentSale.id, amount);
      toast.success('Règlement enregistré.');
      setPaymentSale(null);
      setPaymentAmount('');
      const updated = await creditsApi.getClientCreditDetail(detail.client.id);
      setDetail(updated);
      loadSummary();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur enregistrement');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const formatMoney = (value: number) => `${value.toFixed(2)} ${currencyLabel}`;

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
              <h1 className="page-title">Crédits clients</h1>
              <Link
                to="/sales"
                className="text-[13px] text-text-secondary hover:text-brand transition-colors"
              >
                Ventes
              </Link>
              <Link
                to="/clients"
                className="text-[13px] text-text-secondary hover:text-brand transition-colors"
              >
                Clients
              </Link>
            </>
          )}
        </div>
      </div>

      {!detail ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Input
              placeholder="Rechercher client..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<Search className="w-3.5 h-3.5" />}
              className="max-w-[220px]"
            />
            <Input
              placeholder="Impayées depuis (jours)"
              type="number"
              min={0}
              value={overdueMinDays}
              onChange={(e) => {
                setOverdueMinDays(e.target.value);
                setPage(1);
              }}
              className="w-40"
              title="Afficher uniquement les clients ayant au moins une facture impayée depuis X jours"
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
              <Wallet className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
              <p className="text-[12px] font-medium text-text-muted">Aucun crédit client</p>
              <p className="text-[11px] text-text-muted mt-0.5">Les impayés apparaîtront ici</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Solde dû</TableHead>
                    <TableHead>Nb impayés</TableHead>
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
                          {row.companyName ? (
                            <Building2 className="w-4 h-4 text-text-muted" />
                          ) : (
                            <User className="w-4 h-4 text-text-muted" />
                          )}
                          <span className="text-text-primary font-medium">{getClientDisplayName(row)}</span>
                        </div>
                        {(row.email || row.phone) && (
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {[row.email, row.phone].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-warning">
                        {formatMoney(row.totalDue)}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {row.unpaidCount} facture(s) / ticket(s)
                      </TableCell>
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
                    Page {page} sur {totalPages} ({total} client{total !== 1 ? 's' : ''})
                  </span>
                  <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
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
              {detail.client.companyName ? (
                <Building2 className="w-5 h-5 text-text-muted" />
              ) : (
                <User className="w-5 h-5 text-text-muted" />
              )}
              <span className="font-semibold text-text-primary">
                {detail.client.companyName || [detail.client.firstName, detail.client.lastName].filter(Boolean).join(' ') || 'Client'}
              </span>
            </div>
            {(detail.client.email || detail.client.phone || detail.client.city) && (
              <p className="text-[12px] text-text-muted">
                {[detail.client.email, detail.client.phone, detail.client.city].filter(Boolean).join(' · ')}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payé</TableHead>
                  <TableHead>Restant dû</TableHead>
                  <TableHead>Jours retard</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.unpaidSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {sale.type === 'INVOICE' ? (
                          <FileText className="w-3.5 h-3.5 text-text-muted" />
                        ) : (
                          <Receipt className="w-3.5 h-3.5 text-text-muted" />
                        )}
                        {sale.invoiceNumber || sale.ticketNumber || sale.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {format(new Date(sale.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {sale.dueDate ? format(new Date(sale.dueDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{formatMoney(sale.total)}</TableCell>
                    <TableCell className="text-text-muted">{formatMoney(sale.amountPaid)}</TableCell>
                    <TableCell className="font-medium text-warning">{formatMoney(sale.due)}</TableCell>
                    <TableCell>
                      {sale.daysOverdue != null && sale.daysOverdue > 0 ? (
                        <span className="text-danger font-medium">{sale.daysOverdue} j</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openPaymentModal(sale);
                        }}
                      >
                        <Banknote className="w-3.5 h-3.5 mr-1" />
                        Régler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!paymentSale}
        onClose={() => {
          setPaymentSale(null);
          setPaymentAmount('');
        }}
        title="Enregistrer un règlement"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentSale(null);
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
        {paymentSale && (
          <div className="space-y-4">
            <p className="text-[13px] text-text-secondary">
              Réf. : {paymentSale.invoiceNumber || paymentSale.ticketNumber || paymentSale.id.slice(0, 8)} · Restant dû :{' '}
              <strong className="text-text-primary">{formatMoney(paymentSale.due)}</strong>
            </p>
            <Input
              label="Montant du règlement"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={paymentSale.due.toFixed(2)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
