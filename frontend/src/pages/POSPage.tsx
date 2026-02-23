import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, ShoppingCart, X, Barcode, User, Receipt, Package, Wallet, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { productsApi } from '@/api/products';
import { salesApi } from '@/api/sales';
import { quotesApi } from '@/api/quotes';
import { clientsApi } from '@/api/clients';
import { categoriesApi } from '@/api/categories';
import { currencyApi } from '@/api/currency';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { Product, Category } from '@/types/product';
import { SaleType, PaymentMethod, CreateSaleDto, Sale } from '@/types/sale';
import { Client } from '@/types/client';
import { Html5Qrcode } from 'html5-qrcode';
import { SalesContent } from '@/pages/SalesPage';
import { generateCreditRequest, generateInvoice, type CompanyInfo } from '@/utils/pdf';
import { apiClient } from '@/api/client';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  /** Dans la modale : "comptant" = payer maintenant (espèces/carte/mixte), "credit" = demande de crédit, facture impayée */
  const [paymentChoice, setPaymentChoice] = useState<'comptant' | 'credit'>('comptant');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.TICKET);
  const [isScanning, setIsScanning] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [currencies, setCurrencies] = useState<{ code: string; symbol: string | null; name: string }[]>([]);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>('TND');
  const [saleCurrencyCode, setSaleCurrencyCode] = useState<string>('');
  const [lastCreatedCreditSale, setLastCreatedCreditSale] = useState<Sale | null>(null);
  const [isCreditPrintModalOpen, setIsCreditPrintModalOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { currencyLabel, toDefault } = useDefaultCurrency();

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadClients();
    (async () => {
      try {
        const [list, defaultRes] = await Promise.all([currencyApi.list(), currencyApi.getDefault()]);
        setCurrencies(list.map((c) => ({ code: c.code, symbol: c.symbol, name: c.name })));
        const code = defaultRes.code || 'TND';
        setDefaultCurrencyCode(code);
        setSaleCurrencyCode(code);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll({ limit: 1000 });
      setProducts(response.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des produits');
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des catégories');
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      setClients(response.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des clients');
    }
  };

  const filterProducts = () => {
    let filtered = products.filter((p) => p.isActive !== false);

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode?.includes(searchTerm)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.salePrice,
          discount: 0,
        },
      ]);
    }
    toast.success(`${product.name} ajouté au panier`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleCreateQuote = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    try {
      const quote = await quotesApi.create({
        clientId: selectedClient?.id,
        currencyCode: saleCurrencyCode || defaultCurrencyCode,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      });
      setCart([]);
      toast.success(`Devis ${quote.quoteNumber} créé`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Erreur lors de la création du devis';
      toast.error(msg);
    }
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discount,
    0
  );

  const total = subtotal;

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const product = await productsApi.getByBarcode(barcode);
      if (product && product.isActive !== false) {
        addToCart(product);
      } else {
        toast.error('Produit non trouvé ou inactif');
      }
    } catch (error: any) {
      toast.error('Produit non trouvé');
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleBarcodeScan(decodedText);
          stopScanning();
        },
        (_errorMessage) => {
          // Ignore errors
        }
      );
    } catch (error) {
      toast.error('Erreur lors du démarrage du scan');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    const isCredit = paymentChoice === 'credit';
    if (isCredit) {
      if (!selectedClient) {
        toast.error('Veuillez sélectionner un client pour une demande de crédit');
        return;
      }
    } else if (paymentMethod === PaymentMethod.CASH) {
      if (cashAmount < total) {
        toast.error('Le montant cash est insuffisant');
        return;
      }
    } else if (paymentMethod === PaymentMethod.CARD) {
      if (cardAmount < total) {
        toast.error('Le montant carte est insuffisant');
        return;
      }
    } else if (paymentMethod === PaymentMethod.MIXED) {
      if (cashAmount === 0 || cardAmount === 0) {
        toast.error('Veuillez saisir les montants cash et carte');
        return;
      }
      if (cashAmount + cardAmount < total) {
        toast.error('Le total des montants est insuffisant');
        return;
      }
    }

    try {
      const saleData: CreateSaleDto = {
        clientId: selectedClient?.id,
        type: saleType,
        currencyCode: saleCurrencyCode || defaultCurrencyCode || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        paymentMethod: isCredit ? PaymentMethod.CREDIT : paymentMethod,
        cashAmount: isCredit ? undefined : (paymentMethod === PaymentMethod.CASH || paymentMethod === PaymentMethod.MIXED ? cashAmount : undefined),
        cardAmount: isCredit ? undefined : (paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.MIXED ? cardAmount : undefined),
      };

      const created = await salesApi.create(saleData);
      setCart([]);
      setSelectedClient(null);
      setPaymentMethod(PaymentMethod.CASH);
      setCashAmount(0);
      setCardAmount(0);
      setPaymentChoice('comptant');
      setIsPaymentModalOpen(false);

      if (isCredit) {
        setLastCreatedCreditSale(created);
        setIsCreditPrintModalOpen(true);
        toast.success('Vente à crédit enregistrée');
      } else {
        toast.success('Vente enregistrée avec succès');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement de la vente');
    }
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }

      if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        setIsPaymentModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Optional scanning bar */}
      {isScanning && (
        <div className="flex-shrink-0 bg-card border-b border-border-subtle px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-secondary">Scannez un code-barres</p>
            <Button variant="danger" size="sm" onClick={stopScanning}>
              <X className="w-4 h-4 mr-2" />
              Arrêter
            </Button>
          </div>
          <div id="reader" className="max-w-xs" />
        </div>
      )}

      {/* Three-panel layout: no gaps, border-right dividers */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_360px] overflow-hidden">
        {/* Left panel: bg-surface — products + search */}
        <div className="flex flex-col overflow-hidden bg-surface border-r border-border-subtle" style={{ background: '#17171D' }}>
          <div className="flex-shrink-0 p-3 flex items-center gap-2 border-b border-border-subtle">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              <input
                id="product-search"
                type="text"
                placeholder="Rechercher (F2)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-8 h-8 text-[13px]"
              />
            </div>
            <div className="max-w-[160px] shrink-0">
              <Select
                options={[
                  { value: '', label: 'Toutes catégories' },
                  ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                ]}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input h-8 text-[13px] w-full"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 px-2 text-[12px]" onClick={() => setIsSalesModalOpen(true)}>
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Ventes
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2 text-[12px]" onClick={startScanning} disabled={isScanning}>
              <Barcode className="w-3.5 h-3.5 mr-1.5" />
              {isScanning ? 'Scan...' : 'Scanner'}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group relative rounded-[10px] border border-[#2A2A38] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[rgba(99,102,241,0.4)]"
                  style={{ background: '#1E1E28', padding: 10 }}
                  onClick={() => addToCart(product)}
                >
                  <div
                    className="relative flex items-center justify-center rounded-md overflow-hidden"
                    style={{ height: 72, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}
                  >
                    <Package className="w-7 h-7 text-text-muted" style={{ width: 28, height: 28 }} />
                    <span
                      className="absolute top-1 right-1 font-mono text-[10px] rounded-sm px-1.5 py-0.5"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                      {product.stockCurrent}
                    </span>
                  </div>
                  <p className="text-[12px] font-medium text-text-primary mt-2 truncate" style={{ marginTop: 8 }}>{product.name}</p>
                  <p className="font-mono text-[12px] text-brand mt-0.5">{Number(product.salePrice).toFixed(2)} {currencyLabel}</p>
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-200 hover:bg-[rgba(99,102,241,0.25)]"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  >
                    <Plus className="w-3 h-3 text-brand" style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center panel: bg-base — cart */}
        <div className="flex flex-col overflow-hidden bg-base border-r border-border-subtle">
          <div className="flex-shrink-0 p-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="section-heading text-[13px]">Panier</h2>
            <Button variant="outline" size="sm" className="h-8 px-2 text-[12px]" onClick={() => setIsClientModalOpen(true)}>
              <User className="w-3.5 h-3.5 mr-1.5" />
              {selectedClient
                ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''} ${selectedClient.companyName || ''}`.trim().slice(0, 18) || 'Client'
                : 'Client'}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="flex-shrink-0 text-text-muted mb-2" style={{ width: 36, height: 36, color: 'rgba(99,102,241,0.3)' }} />
                <p className="text-[12px] font-medium text-text-muted">Le panier est vide</p>
                <p className="text-[11px] text-text-muted mt-0.5">Ajoutez des articles depuis le catalogue</p>
              </div>
            ) : (
              <div className="space-y-0">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="group flex items-center gap-2 py-2 border-b border-border-subtle last:border-0 hover:bg-white/[0.025] transition-colors text-[13px]"
                    style={{ padding: '8px 0' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{item.product.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          type="button"
                          className="w-[22px] h-[22px] rounded flex items-center justify-center text-text-muted hover:bg-elevated hover:text-text-primary transition-colors text-[11px]"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v) || v < 0) return;
                            updateQuantity(item.product.id, v);
                          }}
                          className="w-12 h-[22px] rounded text-center font-mono text-[13px] text-text-primary bg-card border border-border-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        {item.product.unit && <span className="text-[11px] text-text-muted">{item.product.unit}</span>}
                        <button
                          type="button"
                          className="w-[22px] h-[22px] rounded flex items-center justify-center text-text-muted hover:bg-elevated hover:text-text-primary transition-colors"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="font-mono text-[13px] text-text-primary text-right">{toDefault(item.unitPrice * item.quantity - item.discount, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="flex-shrink-0 border-t border-border-subtle p-3 space-y-1">
              <div className="flex justify-between text-[13px] text-text-secondary">
                <span>Sous-total</span>
                <span className="font-mono">{toDefault(subtotal, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
              <div className="flex justify-between text-[15px] font-bold text-text-primary pt-1">
                <span>Total</span>
                <span className="font-mono text-right">{toDefault(total, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Devis + Payer */}
        <div className="flex flex-col overflow-hidden p-4" style={{ background: '#17171D' }}>
          <h2 className="section-heading mb-3 text-[13px]">Paiement</h2>
          <p className="text-[11px] text-text-muted mb-3">Créer un devis ou régler la vente (comptant / crédit).</p>
          <div className="flex flex-col gap-2 mt-auto">
            <button
              type="button"
              className="w-full text-text-primary border border-border-subtle hover:bg-elevated hover:border-brand/50 transition-all duration-200 rounded-[10px] font-semibold"
              style={{ height: 44, fontSize: 14 }}
              onClick={handleCreateQuote}
              disabled={cart.length === 0}
            >
              Devis
            </button>
            <button
              type="button"
              className="w-full text-white bg-success hover:bg-[#059669] hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] active:scale-[0.99] transition-all duration-200"
              style={{ height: 52, fontSize: 15, fontWeight: 700, borderRadius: 10, boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}
              onClick={() => {
                if (cart.length > 0) {
                  setPaymentChoice('comptant');
                  setPaymentMethod(PaymentMethod.CASH);
                  setCashAmount(0);
                  setCardAmount(0);
                  setIsPaymentModalOpen(true);
                }
              }}
              disabled={cart.length === 0}
            >
              Payer (F4)
            </button>
          </div>
        </div>
      </div>

      {/* Modal Client */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Sélectionner un client"
        size="md"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSelectedClient(null);
              setIsClientModalOpen(false);
            }}
          >
            Aucun client
          </Button>
          {clients.map((client) => (
            <Button
              key={client.id}
              variant="outline"
              className="w-full text-left"
              onClick={() => {
                setSelectedClient(client);
                setIsClientModalOpen(false);
              }}
            >
              {client.companyName ||
                `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                client.email ||
                'Client sans nom'}
            </Button>
          ))}
        </div>
      </Modal>

      {/* Modal Paiement : choix Payer comptant OU Demande de crédit */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setPaymentChoice('comptant'); }}
        title="Paiement"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsPaymentModalOpen(false); setPaymentChoice('comptant'); }}>
              Annuler
            </Button>
            <Button onClick={handlePayment}>
              {paymentChoice === 'credit' ? 'Enregistrer la demande de crédit' : 'Valider le paiement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Choix : Payer comptant ou Demande de crédit */}
          <div>
            <label className="label-caption block mb-2">Comment régler cette vente ?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPaymentChoice('comptant'); setPaymentMethod(PaymentMethod.CASH); setCashAmount(0); setCardAmount(0); }}
                className={`flex flex-col items-center justify-center rounded-[10px] border py-4 transition-all ${
                  paymentChoice === 'comptant'
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-[#2A2A38] bg-card text-text-secondary hover:border-[#363648]'
                }`}
              >
                <Wallet className="w-6 h-6 mb-1" />
                <span className="text-[13px] font-medium">Payer comptant</span>
                <span className="text-[11px] opacity-80 mt-0.5">Espèces, carte ou mixte</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChoice('credit')}
                className={`flex flex-col items-center justify-center rounded-[10px] border py-4 transition-all ${
                  paymentChoice === 'credit'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-500'
                    : 'border-[#2A2A38] bg-card text-text-secondary hover:border-[#363648]'
                }`}
              >
                <FileSignature className="w-6 h-6 mb-1" />
                <span className="text-[13px] font-medium">Demande de crédit</span>
                <span className="text-[11px] opacity-80 mt-0.5">Facture impayée</span>
              </button>
            </div>
          </div>

          <Select
            label="Type de vente"
            options={[
              { value: SaleType.TICKET, label: 'Ticket (B2C)' },
              { value: SaleType.INVOICE, label: 'Facture (B2B)' },
            ]}
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as SaleType)}
          />

          {currencies.length > 0 && (
            <Select
              label="Devise de la facture"
              options={currencies.map((c) => ({
                value: c.code,
                label: c.symbol ? `${c.code} (${c.symbol})` : c.code,
              }))}
              value={saleCurrencyCode || defaultCurrencyCode}
              onChange={(e) => setSaleCurrencyCode(e.target.value)}
            />
          )}

          {paymentChoice === 'comptant' && (
            <>
              <Select
                label="Méthode de paiement"
                options={[
                  { value: PaymentMethod.CASH, label: 'Espèces' },
                  { value: PaymentMethod.CARD, label: 'Carte' },
                  { value: PaymentMethod.MIXED, label: 'Mixte' },
                ]}
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  setCashAmount(0);
                  setCardAmount(0);
                }}
              />

              {paymentMethod === PaymentMethod.CASH && (
                <Input
                  label="Montant reçu"
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                />
              )}

              {paymentMethod === PaymentMethod.CARD && (
                <Input
                  label="Montant carte"
                  type="number"
                  step="0.01"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                />
              )}

              {paymentMethod === PaymentMethod.MIXED && (
                <>
                  <Input
                    label="Montant espèces"
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="Montant carte"
                    type="number"
                    step="0.01"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                  />
                </>
              )}
            </>
          )}

          {paymentChoice === 'credit' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              {selectedClient ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Facture impayée pour <strong>{selectedClient.companyName || `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() || 'ce client'}</strong>. Vous pourrez imprimer la demande de crédit (à faire signer) et valider un paiement plus tard dans Ventes.
                </p>
              ) : (
                <p className="text-amber-600 dark:text-amber-400">
                  Sélectionnez un client (bouton Client en caisse) pour enregistrer une demande de crédit. La facture sera marquée impayée.
                </p>
              )}
            </div>
          )}

          <div className="bg-elevated p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Total {paymentChoice === 'credit' ? 'dû' : 'à payer'}:</span>
              <span className="font-bold">{toDefault(total, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
            </div>
            {paymentChoice === 'comptant' && paymentMethod === PaymentMethod.CASH && cashAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Monnaie:</span>
                <span>{toDefault(cashAmount - total, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
            )}
            {paymentChoice === 'comptant' && paymentMethod === PaymentMethod.CARD && cardAmount > 0 && cardAmount !== total && (
              <div className="flex justify-between text-sm">
                <span>Différence:</span>
                <span className={cardAmount > total ? 'text-success' : 'text-danger'}>
                  {toDefault(cardAmount - total, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}
                </span>
              </div>
            )}
            {paymentChoice === 'comptant' && paymentMethod === PaymentMethod.MIXED && (
              <div className="flex justify-between text-sm">
                <span>Total reçu:</span>
                <span>{toDefault(cashAmount + cardAmount, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}</span>
              </div>
            )}
            {paymentChoice === 'comptant' && paymentMethod === PaymentMethod.MIXED && (cashAmount + cardAmount) !== total && (
              <div className="flex justify-between text-sm">
                <span>Différence:</span>
                <span className={(cashAmount + cardAmount) > total ? 'text-success' : 'text-danger'}>
                  {toDefault((cashAmount + cardAmount) - total, saleCurrencyCode || defaultCurrencyCode).toFixed(2)} {currencyLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal après vente à crédit : imprimer demande de crédit / facture */}
      <Modal
        isOpen={isCreditPrintModalOpen}
        onClose={() => { setIsCreditPrintModalOpen(false); setLastCreatedCreditSale(null); }}
        title="Vente à crédit enregistrée"
        size="sm"
        footer={
          <Button variant="outline" onClick={() => { setIsCreditPrintModalOpen(false); setLastCreatedCreditSale(null); }}>
            Fermer
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Vous pouvez imprimer la demande de crédit (à faire signer au client) et la facture (marquée impayée).
          </p>
          {lastCreatedCreditSale && (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { data: company } = await apiClient.get<CompanyInfo>('/company').catch(() => ({ data: null }));
                    await generateCreditRequest(lastCreatedCreditSale, company);
                    toast.success('Demande de crédit téléchargée');
                  } catch (e) {
                    toast.error('Erreur lors de la génération du PDF');
                  }
                }}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Imprimer demande de crédit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { data: company } = await apiClient.get<CompanyInfo>('/company').catch(() => ({ data: null }));
                    await generateInvoice(lastCreatedCreditSale, company);
                    toast.success('Facture téléchargée');
                  } catch (e) {
                    toast.error('Erreur lors de la génération du PDF');
                  }
                }}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Imprimer facture (impayée)
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Ventes plein écran */}
      <Modal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        title="Gestion des Ventes"
        size="fullscreen"
      >
        <SalesContent />
      </Modal>
    </div>
  );
}

