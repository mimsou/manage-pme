import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Product } from '@/types/product';
import { productsApi } from '@/api/products';
import { cn } from '@/lib/utils';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

interface ProductSelectProps {
  value?: string;
  onChange: (productId: string) => void;
  onProductSelect?: (product: Product) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function ProductSelect({
  value,
  onChange,
  onProductSelect,
  placeholder = 'Rechercher un produit...',
  error,
  disabled,
}: ProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currencyLabel } = useDefaultCurrency();

  useEffect(() => {
    // Charger le produit sélectionné si value existe
    if (value && !selectedProduct) {
      loadProductById(value);
    } else if (!value && selectedProduct) {
      setSelectedProduct(null);
    }
  }, [value]);

  useEffect(() => {
    // Recherche avec debounce
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchProducts();
      } else if (searchTerm.length === 0) {
        setProducts([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    // Fermer le dropdown si on clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProductById = async (productId: string) => {
    try {
      const product = await productsApi.getById(productId);
      setSelectedProduct(product);
    } catch (error) {
      console.error('Erreur lors du chargement du produit');
    }
  };

  const searchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll({
        search: searchTerm,
        limit: 20,
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    onChange(product.id);
    if (onProductSelect) {
      onProductSelect(product);
    }
    setSearchTerm('');
    setProducts([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedProduct(null);
    onChange('');
    setSearchTerm('');
    setProducts([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <div className="relative">
        {selectedProduct ? (
          <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-card border-border-default">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-text-primary">{selectedProduct.name}</div>
              <div className="text-xs text-text-muted">SKU: {selectedProduct.sku}</div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-text-muted hover:text-text-primary transition-colors duration-default ease-default"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'w-full px-3 py-2 pl-10 border rounded-lg bg-card text-text-primary placeholder-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-brand',
                error
                  ? 'border-danger focus:ring-danger'
                  : 'border-border-default',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}

      {isOpen && !selectedProduct && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border-default rounded-lg shadow-elevated max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-text-muted">Recherche...</div>
          ) : products.length === 0 ? (
            <div className="px-4 py-2 text-sm text-text-muted">
              {searchTerm.length < 2
                ? 'Tapez au moins 2 caractères pour rechercher'
                : 'Aucun produit trouvé'}
            </div>
          ) : (
            <ul className="py-1">
              {products.map((product) => (
                <li
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="px-4 py-2 hover:bg-elevated cursor-pointer transition-colors duration-default ease-default text-text-primary"
                >
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-xs text-text-muted">
                    SKU: {product.sku} | Stock: {product.stockCurrent} | Prix: {Number(product.purchasePrice).toFixed(2)} {currencyLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

