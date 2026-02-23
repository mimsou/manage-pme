import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  FileText,
  Filter,
  Eye,
  Printer,
  Building2,
  User,
  ArrowRightCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { quotesApi } from '@/api/quotes';
import { clientsApi } from '@/api/clients';
import { Quote, QuoteStatus, QuoteItem } from '@/types/quote';
import { Client } from '@/types/client';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { generateQuote, type CompanyInfo } from '@/utils/pdf';
import { apiClient } from '@/api/client';

function formatDate(s: string | unknown) {
  try {
    const str = typeof s === 'string' ? s : String(s ?? '');
    if (!str) return '—';
    return format(new Date(str), 'dd/MM/yyyy');
  } catch {
    return typeof s === 'string' ? s : '—';
  }
}

function getStatusLabel(status: QuoteStatus | unknown): string {
  const s = typeof status === 'string' ? status : String(status ?? '');
  const labels: Record<string, string> = {
    [QuoteStatus.DRAFT]: 'Brouillon',
    [QuoteStatus.SENT]: 'Envoyé',
    [QuoteStatus.ACCEPTED]: 'Accepté',
    [QuoteStatus.REFUSED]: 'Refusé',
    [QuoteStatus.EXPIRED]: 'Expiré',
    [QuoteStatus.CONVERTED]: 'Converti',
  };
  return labels[s] ?? (s || '—');
}

function getStatusBadgeStyle(status: QuoteStatus | unknown): React.CSSProperties {
  const s = typeof status === 'string' ? status : String(status ?? '');
  const map: Record<string, { bg: string; color: string }> = {
    [QuoteStatus.DRAFT]: { bg: 'rgba(148,163,184,0.2)', color: '#94A3B8' },
    [QuoteStatus.SENT]: { bg: 'rgba(59,130,246,0.2)', color: '#3B82F6' },
    [QuoteStatus.ACCEPTED]: { bg: 'rgba(16,185,129,0.2)', color: '#10B981' },
    [QuoteStatus.REFUSED]: { bg: 'rgba(239,68,68,0.2)', color: '#EF4444' },
    [QuoteStatus.EXPIRED]: { bg: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
    [QuoteStatus.CONVERTED]: { bg: 'rgba(16,185,129,0.2)', color: '#10B981' },
  };
  const style = map[s] ?? { bg: 'rgba(148,163,184,0.2)', color: '#94A3B8' };
  return { backgroundColor: style.bg, color: style.color, padding: '2px 8px', borderRadius: 6, fontSize: 11 };
}

/** Coerce API value (e.g. Prisma Decimal) to number for display. */
function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Coerce to string so we never render an object as React child. */
function toStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return String(v);
}

function getClientDisplay(quote: Quote): string {
  if (quote.client && typeof quote.client === 'object') {
    const c = quote.client as Record<string, unknown>;
    const name = (c.companyName as string) ||
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return name || 'Client sans nom';
  }
  return '—';
}

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertQuantities, setConvertQuantities] = useState<Record<string, number>>({});
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  const [company, setCompany] = useState<CompanyInfo | null>(null);

  const { currencyLabel, toDefault } = useDefaultCurrency();

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasActiveFilters = !!(startDate || endDate || clientIdFilter || statusFilter);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const res = await quotesApi.getAll({
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        clientId: clientIdFilter || undefined,
        status: statusFilter ? (statusFilter as QuoteStatus) : undefined,
      });
      setQuotes(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [page, startDate, endDate, clientIdFilter, statusFilter]);

  useEffect(() => {
    clientsApi.getAll({ limit: 500 }).then((r) => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get<CompanyInfo>('/company').then((r) => setCompany(r.data)).catch(() => {});
  }, []);

  const openDetail = async (id: string) => {
    try {
      const quote = await quotesApi.getById(id);
      setSelectedQuote(quote);
      setIsDetailModalOpen(true);
      const qty: Record<string, number> = {};
      quote.items.forEach((i) => { qty[i.id] = i.quantity; });
      setConvertQuantities(qty);
    } catch {
      toast.error('Devis introuvable');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setClientIdFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handlePrint = (quote: Quote) => {
    generateQuote(quote, company);
  };

  const openConvertModal = () => {
    if (!selectedQuote) return;
    const qty: Record<string, number> = {};
    selectedQuote.items.forEach((i) => { qty[i.id] = i.quantity; });
    setConvertQuantities(qty);
    setIsConvertModalOpen(true);
  };

  const handleConvertToSale = async () => {
    if (!selectedQuote) return;
    const quantities = selectedQuote.items.map((item) => ({
      quoteItemId: item.id,
      quantity: convertQuantities[item.id] ?? toNum(item.quantity),
    })).filter((q) => q.quantity > 0);
    if (quantities.length === 0) {
      toast.error('Indiquez au moins une quantité à facturer.');
      return;
    }
    for (const q of quantities) {
      const item = selectedQuote.items.find((i) => i.id === q.quoteItemId);
      if (item && q.quantity > toNum(item.quantity)) {
        toast.error(`Quantité pour ${item.product?.name ?? 'ligne'} ne peut pas dépasser ${toNum(item.quantity)}`);
        return;
      }
    }
    setConvertSubmitting(true);
    try {
      const sale = await quotesApi.convertToSale(selectedQuote.id, {
        quantities: quantities.map((q) => ({ quoteItemId: q.quoteItemId, quantity: q.quantity })),
      });
      toast.success('Facture créée à partir du devis');
      setIsConvertModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedQuote(null);
      loadQuotes();
      navigate(`/sales`);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && e.response && typeof (e.response as any).data?.message === 'string'
        ? (e.response as { data: { message: string } }).data.message
        : 'Erreur lors de la conversion';
      toast.error(msg);
    } finally {
      setConvertSubmitting(false);
    }
  };

  const canConvert = selectedQuote &&
    selectedQuote.status !== QuoteStatus.CONVERTED &&
    !selectedQuote.convertedSaleId &&
    selectedQuote.items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="w-6 h-6" style={{ color: 'rgba(99,102,241,0.9)' }} />
          Devis
        </h1>
        <Button
          variant="outline"
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtres
          {hasActiveFilters && <span className="rounded-full bg-brand/20 px-1.5 text-[11px]">1</span>}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : quotes.length === 0 ? (
        <div className="rounded-[10px] border flex flex-col items-center justify-center py-12" style={{ background: '#1E1E28', borderColor: '#2A2A38' }}>
          <FileText className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucun devis</p>
          <p className="text-[11px] text-text-muted mt-0.5">Créez un devis depuis le Point de vente (bouton Devis)</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Devis</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono font-medium">{toStr(q.quoteNumber)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {q.client?.companyName ? <Building2 className="w-4 h-4 text-text-muted" /> : <User className="w-4 h-4 text-text-muted" />}
                      {getClientDisplay(q)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-text-primary">
                    {toDefault(toNum(q.total), toStr(q.currencyCode) || undefined).toFixed(2)} {currencyLabel}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]" style={getStatusBadgeStyle(q.status)}>
                      {getStatusLabel(q.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {q.validUntil ? formatDate(toStr(q.validUntil)) : '—'}
                  </TableCell>
                  <TableCell className="text-text-secondary">{formatDate(toStr(q.createdAt))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-white/5 hover:text-text-primary"
                        onClick={() => openDetail(q.id)}
                        title="Voir le devis"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-white/5 hover:text-text-primary"
                        onClick={() => handlePrint(q)}
                        title="Imprimer le devis"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
              <span className="text-[13px] text-text-secondary">Page {page} sur {totalPages}</span>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Suivant
              </Button>
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
            {hasActiveFilters && <Button variant="outline" onClick={clearFilters}>Réinitialiser</Button>}
            <Button onClick={() => setIsFilterModalOpen(false)}>Appliquer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date de début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="Date de fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Client</label>
            <select
              className="input w-full"
              value={clientIdFilter}
              onChange={(e) => setClientIdFilter(e.target.value)}
            >
              <option value="">Tous</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sans nom'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Statut</label>
            <select
              className="input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous</option>
              {(Object.keys(QuoteStatus) as QuoteStatus[]).map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal Détail devis */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedQuote(null); }}
        title={selectedQuote ? `Devis ${selectedQuote.quoteNumber}` : 'Devis'}
        size="lg"
        footer={
          <>
            {selectedQuote && (
              <button
                type="button"
                className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-white/5 hover:text-text-primary"
                onClick={() => handlePrint(selectedQuote)}
                title="Imprimer"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}
            <Button variant="outline" onClick={() => { setIsDetailModalOpen(false); setSelectedQuote(null); }}>Fermer</Button>
            {canConvert && (
              <Button onClick={openConvertModal} className="flex items-center gap-2">
                <ArrowRightCircle className="w-4 h-4" />
                Créer une facture
              </Button>
            )}
          </>
        }
      >
        {selectedQuote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <span className="text-text-muted">Client : </span>
                <span className="text-text-primary">{getClientDisplay(selectedQuote)}</span>
              </div>
              <div>
                <span className="text-text-muted">Total : </span>
                <span className="font-mono font-medium text-text-primary">
                  {toDefault(toNum(selectedQuote.total), toStr(selectedQuote.currencyCode) || undefined).toFixed(2)} {currencyLabel}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Validité : </span>
                <span>{selectedQuote.validUntil ? formatDate(toStr(selectedQuote.validUntil)) : '—'}</span>
              </div>
              <div>
                <span className="text-text-muted">Statut : </span>
                <span style={getStatusBadgeStyle(selectedQuote.status)}>{getStatusLabel(selectedQuote.status)}</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Prix unit.</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedQuote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name ?? '-'}</TableCell>
                    <TableCell className="font-mono">{toNum(item.quantity)}</TableCell>
                    <TableCell className="font-mono">{toNum(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{toNum(item.discount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{toNum(item.totalPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {selectedQuote.convertedSaleId && (
              <p className="text-[12px] text-success">
                Ce devis a été converti en facture. Consultez la facture dans la section Ventes.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Convertir en facture (quantités complètes ou partielles) */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Créer une facture à partir du devis"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsConvertModalOpen(false)}>Annuler</Button>
            <Button onClick={handleConvertToSale} disabled={convertSubmitting}>
              {convertSubmitting ? 'Création...' : 'Créer la facture'}
            </Button>
          </>
        }
      >
        {selectedQuote && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-muted">
              Choisissez les quantités à facturer par ligne. Vous pouvez facturer tout ou partie du devis.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Qté commandée</TableHead>
                  <TableHead>Qté à facturer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedQuote.items.map((item: QuoteItem) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name ?? '-'}</TableCell>
                    <TableCell className="font-mono">{toNum(item.quantity)}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min={0}
                        max={toNum(item.quantity)}
                        value={convertQuantities[item.id] ?? toNum(item.quantity)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setConvertQuantities((prev) => ({
                            ...prev,
                            [item.id]: Number.isFinite(v) ? Math.max(0, Math.min(toNum(item.quantity), v)) : 0,
                          }));
                        }}
                        className="input w-20 text-center font-mono"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Modal>
    </div>
  );
}
