import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Search, Edit, Trash2, Package, Barcode, AlertTriangle, History, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Card, CardContent } from '@/components/ui/Card';
import { productsApi } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { stockApi } from '@/api/stock';
import { Product, Category, CreateProductDto } from '@/types/product';
import { StockMovement, StockMovementType, CreateDamageDto } from '@/types/stock';
import { useAuthStore } from '@/stores/authStore';
import { VariantBuilder } from '@/components/products/VariantBuilder';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

const PRODUCT_UNITS = [
  { value: 'pièce', label: 'pièce' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'mL', label: 'mL' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'lot', label: 'lot' },
  { value: 'paquet', label: 'paquet' },
  { value: 'boîte', label: 'boîte' },
  { value: 'rouleau', label: 'rouleau' },
  { value: 'sachet', label: 'sachet' },
];

const productSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid('La catégorie doit être valide').min(1, 'La catégorie est requise'),
  purchasePrice: z.number().min(0, 'Le prix doit être positif').optional(),
  salePrice: z.number().min(0, 'Le prix doit être positif').optional(),
  unit: z.string().optional(),
  stockMin: z.number().min(0).optional(),
  stockCurrent: z.number().min(0).optional(),
  description: z.string().optional(),
  hasVariants: z.boolean().optional(),
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProductForDamage, setSelectedProductForDamage] = useState<Product | null>(null);
  const [damageMovements, setDamageMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyProductId, setHistoryProductId] = useState<string>('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [useVariants, setUseVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{
    id: string;
    attributes: Array<{ type: string; value: string }>;
    purchasePrice?: number;
    salePrice?: number;
    stockCurrent: number;
    stockMin: number;
    barcode?: string;
    generatedSku?: string;
  }>>([]);
  const { user } = useAuthStore();
  const { currencyLabel } = useDefaultCurrency();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    formState: { errors: categoryErrors, isSubmitting: isSubmittingCategory },
    reset: resetCategory,
  } = useForm<{ name: string; description?: string; parentId?: string }>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, 'Le nom est requis'),
        description: z.string().optional(),
        parentId: z.string().uuid('La catégorie parent doit être valide').optional().or(z.literal('')),
      })
    ),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateProductDto>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      stockMin: 0,
      stockCurrent: 0,
      hasVariants: false,
      purchasePrice: 0,
      salePrice: 0,
      unit: 'pièce',
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const {
    register: registerDamage,
    handleSubmit: handleSubmitDamage,
    formState: { errors: damageErrors, isSubmitting: isSubmittingDamage },
    reset: resetDamage,
    watch: watchDamage,
  } = useForm<CreateDamageDto>({
    resolver: zodResolver(
      z.object({
        productId: z.string(),
        type: z.enum([StockMovementType.DAMAGE, StockMovementType.LOSS]),
        quantity: z.number().refine((val) => val !== 0, 'La quantité ne peut pas être zéro'),
        reason: z.string().min(1, 'La justification est requise'),
      })
    ),
  });

  const damageType = watchDamage('type');

  const purchasePrice = watch('purchasePrice') || 0;
  const salePrice = watch('salePrice') || 0;
  const margin = salePrice - purchasePrice;
  const marginPercent = purchasePrice > 0 ? ((margin / purchasePrice) * 100).toFixed(2) : '0';

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, searchTerm, selectedCategory]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N pour créer une catégorie
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && isModalOpen && !editingProduct) {
        e.preventDefault();
        handleNewCategory();
      }
      // Ctrl/Cmd + Enter pour soumettre le formulaire
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isModalOpen) {
        e.preventDefault();
        if (useVariants && variants.length > 0 && !editingProduct) {
          const name = watch('name') || '';
          const categoryId = watch('categoryId') || '';
          if (name && categoryId && variants.length > 0) {
            const formData = {
              name,
              description: watch('description'),
              categoryId,
              sku: '',
              barcode: watch('barcode'),
              purchasePrice: 0,
              salePrice: 0,
              stockMin: 0,
              stockCurrent: 0,
              hasVariants: true,
            } as CreateProductDto;
            onSubmit(formData);
          }
        } else if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, useVariants, variants, editingProduct, watch]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll({
        search: searchTerm || undefined,
        categoryId: selectedCategory || undefined,
        page,
        limit: 10,
      });
      setProducts(response.data);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
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

  const onSubmit = async (data: CreateProductDto) => {
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
        toast.success('Produit modifié avec succès');
      } else {
        // Si on utilise les variantes, créer avec variantes
        if (useVariants && variants.length > 0) {
          // Valider que toutes les variantes ont des attributs remplis
          const invalidVariants = variants.filter(v => 
            v.attributes.some(attr => !attr.value || attr.value.trim() === '')
          );
          if (invalidVariants.length > 0) {
            toast.error('Veuillez remplir tous les attributs de chaque variante');
            return;
          }
          
          // Valider que chaque variante a des prix définis
          const variantsWithoutPrices = variants.filter(v => !v.purchasePrice || !v.salePrice);
          if (variantsWithoutPrices.length > 0) {
            toast.error('Veuillez définir les prix d\'achat et de vente pour chaque variante');
            return;
          }

          // Valider que le nom et la catégorie sont présents
          if (!data.name || !data.categoryId) {
            toast.error('Le nom et la catégorie sont requis');
            return;
          }

          const createdProducts = await productsApi.createWithVariants({
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            unit: data.unit || 'pièce',
            variants: variants.map(v => ({
              attributes: v.attributes,
              purchasePrice: v.purchasePrice!,
              salePrice: v.salePrice!,
              stockCurrent: v.stockCurrent,
              stockMin: v.stockMin,
              barcode: v.barcode,
            })),
          });
          toast.success(`${createdProducts.length} produit(s) créé(s) avec succès`);
        } else {
          // Valider que le SKU est présent si pas de variantes
          if (!data.sku || data.sku.trim() === '') {
            toast.error('Le SKU est requis pour un produit sans variantes');
            return;
          }
          // Valider que les prix sont présents si pas de variantes
          if (!data.purchasePrice || !data.salePrice) {
            toast.error('Les prix d\'achat et de vente sont requis pour un produit sans variantes');
            return;
          }
          await productsApi.create(data);
          toast.success('Produit créé avec succès');
        }
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      reset();
      setUseVariants(false);
      setVariants([]);
      loadProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      unit: product.unit || 'pièce',
      stockMin: product.stockMin,
      stockCurrent: product.stockCurrent,
      description: product.description || '',
      hasVariants: product.hasVariants || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await productsApi.delete(id);
      toast.success('Produit supprimé avec succès');
      loadProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleNew = () => {
    setEditingProduct(null);
    setUseVariants(false);
    setVariants([]);
    reset({
      stockMin: 0,
      stockCurrent: 0,
      hasVariants: false,
      unit: 'pièce',
    });
    setIsModalOpen(true);
  };

  const handleDamage = (product: Product) => {
    setSelectedProductForDamage(product);
    resetDamage({
      productId: product.id,
      type: StockMovementType.DAMAGE,
      quantity: -1,
      reason: '',
    });
    setIsDamageModalOpen(true);
  };

  const onSubmitDamage = async (data: CreateDamageDto) => {
    try {
      await stockApi.createDamage(data);
      toast.success('Avarie enregistrée avec succès');
      setIsDamageModalOpen(false);
      setSelectedProductForDamage(null);
      resetDamage();
      loadProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'avarie');
    }
  };

  const handleShowHistory = async () => {
    setIsHistoryModalOpen(true);
    loadDamageHistory();
  };

  const loadDamageHistory = async () => {
    try {
      setHistoryLoading(true);
      // Récupérer les mouvements de type DAMAGE et LOSS séparément
      const [damageResponse, lossResponse] = await Promise.all([
        stockApi.getMovements({
          type: StockMovementType.DAMAGE,
          startDate: historyStartDate || undefined,
          endDate: historyEndDate || undefined,
          productId: historyProductId || undefined,
          page: historyPage,
          limit: 20,
        }),
        stockApi.getMovements({
          type: StockMovementType.LOSS,
          startDate: historyStartDate || undefined,
          endDate: historyEndDate || undefined,
          productId: historyProductId || undefined,
          page: historyPage,
          limit: 20,
        }),
      ]);
      // Combiner les résultats et trier par date
      const combinedMovements = [...damageResponse.data, ...lossResponse.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDamageMovements(combinedMovements);
      // Calculer le total des pages (approximation)
      const totalItems = damageResponse.total + lossResponse.total;
      setHistoryTotalPages(Math.ceil(totalItems / 20));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryModalOpen) {
      loadDamageHistory();
    }
  }, [historyPage, historyStartDate, historyEndDate, historyProductId, isHistoryModalOpen]);

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

  const getDamageTypeLabel = (type: StockMovementType) => {
    return type === StockMovementType.DAMAGE ? 'Casse' : 'Perte';
  };

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const handleNewCategory = () => {
    resetCategory({
      name: '',
      description: '',
      parentId: '',
    });
    setIsCategoryModalOpen(true);
  };

  const onSubmitCategory = async (data: { name: string; description?: string; parentId?: string }) => {
    try {
      const cleanedData: { name: string; description?: string; parentId?: string } = {
        name: data.name,
      };
      if (data.description) cleanedData.description = data.description;
      if (data.parentId) cleanedData.parentId = data.parentId;

      const newCategory = await categoriesApi.create(cleanedData);
      toast.success('Catégorie créée avec succès');
      setIsCategoryModalOpen(false);
      resetCategory();
      await loadCategories();
      
      // Si le modal produit est ouvert, pré-sélectionner la nouvelle catégorie
      if (isModalOpen) {
        reset({
          ...watch(),
          categoryId: newCategory.id,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la catégorie');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Produits</h1>
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <Button variant="outline" className="btn" onClick={handleNewCategory}>
              <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
              Nouvelle catégorie
            </Button>
          )}
          <Button variant="outline" className="btn" onClick={handleShowHistory}>
            <History className="w-3.5 h-3.5 mr-1.5" />
            Historique avaries
          </Button>
          {isAdminOrManager && (
            <Button onClick={handleNew} className="btn">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nouveau produit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4" style={{ gap: 12 }}>
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          icon={<Search className="w-3.5 h-3.5" />}
        />
        <Select
          options={categoryOptions}
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : products.length === 0 ? (
        <div className="rounded-[10px] border flex flex-col items-center justify-center py-12" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <Package className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucun produit trouvé</p>
          <p className="text-[11px] text-text-muted mt-0.5">Créez un produit ou modifiez les filtres</p>
        </div>
      ) : (
        <>
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Code-barres</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Prix d'achat</TableHead>
                    <TableHead>Prix de vente</TableHead>
                    <TableHead>Marge</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>
                        {product.barcode ? (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-4 h-4" />
                            {product.barcode}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{product.category?.name || '-'}</TableCell>
                      <TableCell className="font-mono text-text-primary text-right">{Number(product.purchasePrice).toFixed(2)} {currencyLabel}</TableCell>
                      <TableCell className="font-mono text-text-primary text-right">{Number(product.salePrice).toFixed(2)} {currencyLabel}</TableCell>
                      <TableCell className={`font-mono text-right ${product.salePrice - product.purchasePrice >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(Number(product.salePrice) - Number(product.purchasePrice)).toFixed(2)} {currencyLabel}
                      </TableCell>
                      <TableCell className="text-text-secondary text-[13px]">{product.unit || 'pièce'}</TableCell>
                      <TableCell className="font-mono text-text-primary">
                        <span className={product.stockCurrent <= product.stockMin ? 'text-danger font-semibold' : ''}>
                          {product.stockCurrent} / {product.stockMin}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                            onClick={() => handleDamage(product)}
                            title="Enregistrer une avarie"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                          </button>
                          {isAdminOrManager && (
                            <>
                              <button
                                type="button"
                                className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                                onClick={() => handleEdit(product)}
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                              </button>
                              {user?.role === 'ADMIN' && (
                                <button
                                  type="button"
                                  className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                                  onClick={() => handleDelete(product.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                                </button>
                              )}
                            </>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          setUseVariants(false);
          setVariants([]);
          reset();
        }}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        size={useVariants && !editingProduct ? "xl" : "lg"}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
                setUseVariants(false);
                setVariants([]);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (useVariants && variants.length > 0 && !editingProduct) {
                  // Pour les variantes, on contourne la validation Zod
                  const name = watch('name') || '';
                  const categoryId = watch('categoryId') || '';
                  
                  // Validation basique
                  if (!name || !categoryId) {
                    toast.error('Le nom et la catégorie sont requis');
                    return;
                  }
                  
                  if (variants.length === 0) {
                    toast.error('Veuillez ajouter au moins une variante');
                    return;
                  }
                  
                  const formData = {
                    name,
                    description: watch('description'),
                    categoryId,
                    sku: '',
                    barcode: watch('barcode'),
                    unit: watch('unit') || 'pièce',
                    purchasePrice: 0,
                    salePrice: 0,
                    stockMin: 0,
                    stockCurrent: 0,
                    hasVariants: true,
                  } as CreateProductDto;
                  
                  onSubmit(formData);
                } else {
                  // Déclencher la soumission du formulaire
                  if (formRef.current) {
                    formRef.current.requestSubmit();
                  }
                }
              }}
              isLoading={isSubmitting}
              className="bg-brand hover:bg-brand-dark text-text-primary font-semibold shadow-glow-primary transition-colors duration-default ease-default"
            >
              {editingProduct ? 'Modifier' : useVariants ? `Créer ${variants.length} produit${variants.length > 1 ? 's' : ''}` : 'Créer'}
            </Button>
          </>
        }
      >
        <form 
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            if (useVariants && variants.length > 0 && !editingProduct) {
              // Pour les variantes, on contourne la validation Zod
              const name = watch('name') || '';
              const categoryId = watch('categoryId') || '';
              
              // Validation basique
              if (!name || !categoryId) {
                toast.error('Le nom et la catégorie sont requis');
                return;
              }
              
              if (variants.length === 0) {
                toast.error('Veuillez ajouter au moins une variante');
                return;
              }
              
              const formData = {
                name,
                description: watch('description'),
                categoryId,
                sku: '',
                barcode: watch('barcode'),
                unit: watch('unit') || 'pièce',
                purchasePrice: 0,
                salePrice: 0,
                stockMin: 0,
                stockCurrent: 0,
                hasVariants: true,
              } as CreateProductDto;
              
              onSubmit(formData);
            } else {
              handleSubmit(onSubmit)(e);
            }
          }} 
          className="space-y-6"
        >
          {/* En-tête avec toggle variantes */}
          {!editingProduct && (
            <div className="flex items-center justify-between p-4 bg-brand/10 rounded-xl border-2 border-border-default">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  useVariants 
                    ? 'bg-brand shadow-glow-primary' 
                    : 'bg-elevated'
                }`}>
                  <Package className={`w-6 h-6 ${useVariants ? 'text-text-primary' : 'text-text-muted'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">
                    {useVariants ? 'Mode Variantes' : 'Mode Simple'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {useVariants 
                      ? 'Créez plusieurs produits avec attributs (couleur, taille, etc.)' 
                      : 'Créez un produit unique avec un SKU'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useVariants}
                  onChange={(e) => {
                    setUseVariants(e.target.checked);
                    if (!e.target.checked) {
                      setVariants([]);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-elevated peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-text-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border-default after:border after:rounded-full after:h-6 after:w-6 after:transition-all duration-default ease-default peer-checked:bg-brand"></div>
              </label>
            </div>
          )}

          {/* Section Informations de base */}
          <div className="bg-card rounded-xl p-6 border border-border-default shadow-card">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-brand rounded-full"></div>
              Informations de base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={useVariants ? 'md:col-span-2' : ''}>
                <Input
                  label="Nom du produit *"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="Ex: T-shirt, Pantalon, Chaussures..."
                  autoFocus
                />
              </div>
              {!useVariants && (
                <Input
                  label="SKU *"
                  {...register('sku')}
                  error={errors.sku?.message}
                  placeholder="Ex: TS-001, PAN-001..."
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Catégorie *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    {...register('categoryId')}
                    className="flex-1 px-4 py-2.5 border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand border-border-default transition-all text-sm font-medium text-text-primary"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {isAdminOrManager && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNewCategory}
                      title="Créer une nouvelle catégorie (Ctrl+N)"
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-danger">{errors.categoryId.message}</p>
                )}
              </div>
              {!useVariants && (
                <Input
                  label="Code-barres (EAN-13)"
                  {...register('barcode')}
                  error={errors.barcode?.message}
                  placeholder="Optionnel"
                />
              )}
            </div>

            <div className="mt-4">
              <Input
                label="Description"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Description optionnelle du produit..."
              />
            </div>

            <div className="mt-4">
              <Select
                label="Unité de vente"
                {...register('unit')}
                options={PRODUCT_UNITS}
              />
            </div>
          </div>

          {/* Section Prix et Stock (Mode Simple) */}
          {!useVariants && (
            <div className="bg-card rounded-xl p-6 border border-border-default shadow-card">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-success rounded-full"></div>
                Prix et Stock
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prix d'achat *"
                  type="number"
                  step="0.01"
                  {...register('purchasePrice', { valueAsNumber: true })}
                  error={errors.purchasePrice?.message}
                  placeholder="0.00"
                />
                <Input
                  label="Prix de vente *"
                  type="number"
                  step="0.01"
                  {...register('salePrice', { valueAsNumber: true })}
                  error={errors.salePrice?.message}
                  placeholder="0.00"
                />
              </div>

              {purchasePrice > 0 && salePrice > 0 && (
                <div className="mt-4 p-4 bg-success/10 rounded-lg border border-border-default">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">Marge brute</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-success">
                        {margin.toFixed(2)} {currencyLabel}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {marginPercent}% de marge
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Stock actuel"
                  type="number"
                  {...register('stockCurrent', { valueAsNumber: true })}
                  error={errors.stockCurrent?.message}
                  placeholder="0"
                />
                <Input
                  label="Stock minimum"
                  type="number"
                  {...register('stockMin', { valueAsNumber: true })}
                  error={errors.stockMin?.message}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Section Variantes */}
          {useVariants && !editingProduct && (
            <div className="bg-card rounded-xl p-6 border border-border-default shadow-card">
              {variants.length > 0 && (
                <div className="mb-4 p-3 bg-info/10 rounded-lg border border-border-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-info animate-pulse"></div>
                      <span className="text-sm font-semibold text-info">
                        {variants.length} variante{variants.length > 1 ? 's' : ''} en cours
                      </span>
                    </div>
                    <div className="text-xs text-info">
                      {variants.filter(v => 
                        v.attributes.every(attr => attr.value.trim() !== '') &&
                        v.purchasePrice && v.salePrice
                      ).length} / {variants.length} complète{variants.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
              <VariantBuilder
                baseName={watch('name') || ''}
                variants={variants}
                onChange={setVariants}
                defaultPurchasePrice={purchasePrice}
                defaultSalePrice={salePrice}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Avarie */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => {
          setIsDamageModalOpen(false);
          setSelectedProductForDamage(null);
          resetDamage();
        }}
        title={`Enregistrer une avarie - ${selectedProductForDamage?.name || ''}`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsDamageModalOpen(false);
                setSelectedProductForDamage(null);
                resetDamage();
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmitDamage(onSubmitDamage)} isLoading={isSubmittingDamage}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitDamage(onSubmitDamage)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Type d'avarie *
            </label>
            <select
              {...registerDamage('type')}
              className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
            >
              <option value={StockMovementType.DAMAGE}>Casse</option>
              <option value={StockMovementType.LOSS}>Perte</option>
            </select>
            {damageErrors.type && (
              <p className="mt-1 text-sm text-danger">{damageErrors.type.message}</p>
            )}
          </div>

          <div>
            <Input
              label="Quantité *"
              type="number"
              {...registerDamage('quantity', { valueAsNumber: true })}
              error={damageErrors.quantity?.message}
            />
            <p className="mt-1 text-xs text-text-muted">
              Quantité négative pour retirer du stock, positive pour ajouter
            </p>
          </div>

          <div className="bg-info/10 p-3 rounded-lg">
            <p className="text-sm">
              <strong>Stock actuel:</strong> {selectedProductForDamage?.stockCurrent || 0}
            </p>
            {watchDamage('quantity') && (
              <p className="text-sm mt-1">
                <strong>Stock après ajustement:</strong>{' '}
                {(selectedProductForDamage?.stockCurrent || 0) + (watchDamage('quantity') || 0)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Justification *
            </label>
            <textarea
              {...registerDamage('reason')}
              className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
              rows={4}
              placeholder="Ex: Produit cassé lors du transport, produit détruit par erreur..."
            />
            {damageErrors.reason && (
              <p className="mt-1 text-sm text-danger">{damageErrors.reason.message}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Historique des avaries */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryStartDate('');
          setHistoryEndDate('');
          setHistoryProductId('');
          setHistoryPage(1);
        }}
        title="Historique des avaries"
        size="fullscreen"
      >
        <div className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Date de début"
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => {
                    setHistoryStartDate(e.target.value);
                    setHistoryPage(1);
                  }}
                />
                <Input
                  label="Date de fin"
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => {
                    setHistoryEndDate(e.target.value);
                    setHistoryPage(1);
                  }}
                />
                <Select
                  label="Produit"
                  options={[
                    { value: '', label: 'Tous les produits' },
                    ...products.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  value={historyProductId}
                  onChange={(e) => {
                    setHistoryProductId(e.target.value);
                    setHistoryPage(1);
                  }}
                />
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                      setHistoryProductId('');
                      setHistoryPage(1);
                    }}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des avaries */}
          <Card>
            <CardContent className="pt-6">
              {historyLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : damageMovements.length === 0 ? (
                <div className="text-center py-8 text-text-muted">Aucune avarie trouvée</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Justification</TableHead>
                        <TableHead>Utilisateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {damageMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>{formatDate(movement.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {movement.product?.name || '-'}
                            {movement.product?.sku && (
                              <div className="text-xs text-text-muted">SKU: {movement.product.sku}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                movement.type === StockMovementType.DAMAGE
                                  ? 'bg-danger/20 text-danger'
                                  : 'bg-warning/20 text-warning'
                              }`}
                            >
                              {getDamageTypeLabel(movement.type)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                movement.quantity < 0
                                  ? 'text-danger font-semibold'
                                  : 'text-success font-semibold'
                              }
                            >
                              {movement.quantity > 0 ? '+' : ''}
                              {movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm truncate" title={movement.reason || '-'}>
                              {movement.reason || '-'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {movement.user
                              ? `${movement.user.firstName} ${movement.user.lastName}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        Précédent
                      </Button>
                      <span className="text-sm text-text-secondary">
                        Page {historyPage} sur {historyTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                        disabled={historyPage === historyTotalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Modal>

      {/* Modal Création Catégorie */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          resetCategory();
        }}
        title="Nouvelle catégorie"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsCategoryModalOpen(false);
                resetCategory();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitCategory(onSubmitCategory)}
              isLoading={isSubmittingCategory}
            >
              Créer
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="space-y-4">
          <Input
            label="Nom de la catégorie *"
            {...registerCategory('name')}
            error={categoryErrors.name?.message}
            placeholder="Ex: Électronique, Vêtements..."
          />
          <Input
            label="Description"
            {...registerCategory('description')}
            error={categoryErrors.description?.message}
            placeholder="Description optionnelle de la catégorie"
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Catégorie parent (optionnel)
            </label>
            <select
              {...registerCategory('parentId')}
              className="w-full px-3 py-2 border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
            >
              <option value="">Aucune (catégorie principale)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categoryErrors.parentId && (
              <p className="mt-1 text-sm text-danger">
                {categoryErrors.parentId.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

