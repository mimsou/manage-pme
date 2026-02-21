import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Barcode, User, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { productsApi } from '@/api/products';
import { salesApi } from '@/api/sales';
import { clientsApi } from '@/api/clients';
import { categoriesApi } from '@/api/categories';
import { Product, Category } from '@/types/product';
import { SaleType, PaymentMethod, CreateSaleDto } from '@/types/sale';
import { Client } from '@/types/client';
import { Html5Qrcode } from 'html5-qrcode';
import { SalesContent } from '@/pages/SalesPage';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.TICKET);
  const [isScanning, setIsScanning] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadClients();
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

  const updatePrice = (productId: string, price: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, unitPrice: price } : item
      )
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    );
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
        (errorMessage) => {
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

    if (paymentMethod === PaymentMethod.CASH) {
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
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        paymentMethod,
        cashAmount: paymentMethod === PaymentMethod.CASH || paymentMethod === PaymentMethod.MIXED ? cashAmount : undefined,
        cardAmount: paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.MIXED ? cardAmount : undefined,
      };

      await salesApi.create(saleData);
      toast.success('Vente enregistrée avec succès');
      
      // Reset
      setCart([]);
      setSelectedClient(null);
      setPaymentMethod(PaymentMethod.CASH);
      setCashAmount(0);
      setCardAmount(0);
      setIsPaymentModalOpen(false);
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Point de Vente</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSalesModalOpen(true)}>
            <Receipt className="w-4 h-4 mr-2" />
            Ventes
          </Button>
          <Button variant="outline" onClick={startScanning} disabled={isScanning}>
            <Barcode className="w-4 h-4 mr-2" />
            {isScanning ? 'Scan en cours...' : 'Scanner code-barres'}
          </Button>
        </div>
      </div>

      {isScanning && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Scannez un code-barres</p>
              <Button variant="danger" size="sm" onClick={stopScanning}>
                <X className="w-4 h-4 mr-2" />
                Arrêter
              </Button>
            </div>
            <div id="reader" className="mt-4"></div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Panneau gauche - Produits */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="product-search"
                  placeholder="Rechercher un produit (F2)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                  options={[
                    { value: '', label: 'Toutes les catégories' },
                    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                  ]}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Produits disponibles</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <div className="font-medium text-sm mb-1">{product.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                    <div className="text-lg font-bold text-primary-600">
                      {product.salePrice.toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Stock: {product.stockCurrent}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau droit - Panier */}
        <div className="flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Panier</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClientModalOpen(true)}
                >
                  <User className="w-4 h-4 mr-2" />
                  {selectedClient
                    ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''} ${selectedClient.companyName || ''}`.trim()
                    : 'Client'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Le panier est vide</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product.name}</div>
                          <div className="text-xs text-gray-500">{item.product.sku}</div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-xs text-gray-500">Quantité</label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.product.id, parseInt(e.target.value) || 0)
                              }
                              className="w-16 text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500">Prix unitaire</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updatePrice(item.product.id, parseFloat(e.target.value) || 0)
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="text-xs text-gray-500">Remise (€)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            updateDiscount(item.product.id, parseFloat(e.target.value) || 0)
                          }
                          className="text-sm"
                        />
                      </div>

                      <div className="mt-2 text-right">
                        <div className="text-sm font-medium">
                          {(item.unitPrice * item.quantity - item.discount).toFixed(2)} €
                        </div>
                        <div className="text-xs text-gray-500">
                          Marge: {((item.unitPrice - item.product.purchasePrice) * item.quantity).toFixed(2)} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {cart.length > 0 && (
              <div className="border-t p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total:</span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{total.toFixed(2)} €</span>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  Payer (F4)
                </Button>
              </div>
            )}
          </Card>
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

      {/* Modal Paiement */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Paiement"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePayment}>Valider le paiement</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Type de vente"
            options={[
              { value: SaleType.TICKET, label: 'Ticket (B2C)' },
              { value: SaleType.INVOICE, label: 'Facture (B2B)' },
            ]}
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as SaleType)}
          />

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

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Total à payer:</span>
              <span className="font-bold">{total.toFixed(2)} €</span>
            </div>
            {paymentMethod === PaymentMethod.CASH && cashAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Monnaie:</span>
                <span>{(cashAmount - total).toFixed(2)} €</span>
              </div>
            )}
            {paymentMethod === PaymentMethod.CARD && cardAmount > 0 && cardAmount !== total && (
              <div className="flex justify-between text-sm">
                <span>Différence:</span>
                <span className={cardAmount > total ? 'text-green-600' : 'text-red-600'}>
                  {(cardAmount - total).toFixed(2)} €
                </span>
              </div>
            )}
            {paymentMethod === PaymentMethod.MIXED && (
              <div className="flex justify-between text-sm">
                <span>Total reçu:</span>
                <span>{(cashAmount + cardAmount).toFixed(2)} €</span>
              </div>
            )}
            {paymentMethod === PaymentMethod.MIXED && (cashAmount + cardAmount) !== total && (
              <div className="flex justify-between text-sm">
                <span>Différence:</span>
                <span className={(cashAmount + cardAmount) > total ? 'text-green-600' : 'text-red-600'}>
                  {((cashAmount + cardAmount) - total).toFixed(2)} €
                </span>
              </div>
            )}
          </div>
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

