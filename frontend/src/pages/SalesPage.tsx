import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Eye, X, Filter, Receipt, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { salesApi } from '@/api/sales';
import { clientsApi } from '@/api/clients';
import { Sale, SaleType, SaleStatus, PaymentMethod } from '@/types/sale';
import { Client } from '@/types/client';
import { useAuthStore } from '@/stores/authStore';
import { generateInvoice, generateTicket, type CompanyInfo } from '@/utils/pdf';
import { apiClient } from '@/api/client';

export function SalesContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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

  const { user } = useAuthStore();

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
    const labels = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CARD]: 'Carte',
      [PaymentMethod.MIXED]: 'Mixte',
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: SaleStatus) => {
    const badges = {
      [SaleStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [SaleStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [SaleStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      [SaleStatus.REFUNDED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Ventes</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                Actifs
              </span>
            )}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total ventes</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">CA Total</div>
              <div className="text-2xl font-bold">
                {sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)} €
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Marge Totale</div>
              <div className="text-2xl font-bold">
                {sales.reduce((sum, sale) => sum + (sale.margin || 0), 0).toFixed(2)} €
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Panier moyen</div>
              <div className="text-2xl font-bold">
                {sales.length > 0
                  ? (sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length).toFixed(2)
                  : '0.00'}{' '}
                €
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune vente trouvée</div>
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
                      <TableCell className="font-semibold">
                        {sale.total.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <span className={sale.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {sale.margin?.toFixed(2) || '0.00'} €
                        </span>
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(sale.paymentMethod)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            sale.status
                          )}`}
                        >
                          {getStatusLabel(sale.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(sale.id)}
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(sale)}
                            title={`Imprimer ${sale.type === SaleType.INVOICE ? 'Facture' : 'Ticket'}`}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          {sale.status === SaleStatus.COMPLETED && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleCancel(sale.id)}
                              title="Annuler la vente"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} sur {totalPages}
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
        </CardContent>
      </Card>

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
              <Button
                variant="outline"
                onClick={() => handlePrint(selectedSale)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer {selectedSale.type === SaleType.INVOICE ? 'Facture' : 'Ticket'}
              </Button>
            )}
            {selectedSale?.status === SaleStatus.COMPLETED && (
              <Button
                variant="danger"
                onClick={() => selectedSale && handleCancel(selectedSale.id)}
              >
                Annuler la vente
              </Button>
            )}
          </>
        }
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-sm">
                  {formatDate(selectedSale.createdAt)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm">
                  {selectedSale.type === SaleType.TICKET ? 'Ticket (B2C)' : 'Facture (B2B)'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Statut</label>
                <p className="text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                      selectedSale.status
                    )}`}
                  >
                    {getStatusLabel(selectedSale.status)}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Paiement</label>
                <p className="text-sm">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
              </div>
            </div>

            {/* Client */}
            {selectedSale.client && (
              <div>
                <label className="text-sm font-medium text-gray-500">Client</label>
                <p className="text-sm">
                  {selectedSale.client.companyName ||
                    `${selectedSale.client.firstName || ''} ${selectedSale.client.lastName || ''}`.trim() ||
                    selectedSale.client.email ||
                    'Client sans nom'}
                </p>
                {selectedSale.client.phone && (
                  <p className="text-xs text-gray-500">Tél: {selectedSale.client.phone}</p>
                )}
              </div>
            )}

            {/* Vendeur */}
            {selectedSale.user && (
              <div>
                <label className="text-sm font-medium text-gray-500">Vendeur</label>
                <p className="text-sm">
                  {selectedSale.user.firstName} {selectedSale.user.lastName}
                </p>
              </div>
            )}

            {/* Articles */}
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Articles</label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Produit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qté</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Prix unit.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Remise
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium">
                            {item.product?.name || 'Produit supprimé'}
                          </div>
                          {item.product?.sku && (
                            <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm">{item.unitPrice.toFixed(2)} €</td>
                        <td className="px-4 py-2 text-sm">{item.discount.toFixed(2)} €</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {item.totalPrice.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{selectedSale.subtotal.toFixed(2)} €</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Remise:</span>
                  <span className="text-red-600">-{selectedSale.discount.toFixed(2)} €</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>TVA (20%):</span>
                  <span>{selectedSale.tax.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{selectedSale.total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Marge brute:</span>
                <span className={selectedSale.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {selectedSale.margin?.toFixed(2) || '0.00'} €
                </span>
              </div>
            </div>

            {/* Paiement */}
            {(selectedSale.cashAmount || selectedSale.cardAmount) && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-500 mb-2 block">
                  Détails du paiement
                </label>
                <div className="space-y-1 text-sm">
                  {selectedSale.cashAmount && (
                    <div className="flex justify-between">
                      <span>Espèces:</span>
                      <span>{selectedSale.cashAmount.toFixed(2)} €</span>
                    </div>
                  )}
                  {selectedSale.cardAmount && (
                    <div className="flex justify-between">
                      <span>Carte:</span>
                      <span>{selectedSale.cardAmount.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SalesPage() {
  return <SalesContent />;
}
