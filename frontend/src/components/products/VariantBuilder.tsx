import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { productsApi } from '@/api/products';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';

interface VariantAttribute {
  type: string;
  value: string;
}

interface Variant {
  id: string;
  attributes: VariantAttribute[];
  purchasePrice?: number;
  salePrice?: number;
  stockCurrent: number;
  stockMin: number;
  barcode?: string;
  generatedSku?: string;
}

interface VariantBuilderProps {
  baseName: string;
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  defaultPurchasePrice?: number;
  defaultSalePrice?: number;
}

export function VariantBuilder({
  baseName,
  variants,
  onChange,
  defaultPurchasePrice,
  defaultSalePrice,
}: VariantBuilderProps) {
  const [attributeTypes, setAttributeTypes] = useState<string[]>(['color', 'size']);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [focusedVariant, setFocusedVariant] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});
  const { currencyLabel } = useDefaultCurrency();

  // Charger les suggestions depuis l'API
  useEffect(() => {
    loadSuggestions();
  }, [attributeTypes]);

  const loadSuggestions = async () => {
    const newSuggestions: Record<string, string[]> = {};
    for (const type of attributeTypes) {
      try {
        const suggestions = await productsApi.getSkuComponentSuggestions(type);
        newSuggestions[type] = suggestions;
      } catch (error) {
        console.error(`Error loading suggestions for ${type}:`, error);
        newSuggestions[type] = [];
      }
    }
    setSuggestions(newSuggestions);
  };

  const generateSku = (attributes: VariantAttribute[]): string => {
    if (!baseName || baseName.trim().length === 0) {
      return '';
    }
    const basePrefix = baseName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 2)
      .toUpperCase();
    
    const components = attributes
      .map(attr => attr.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''))
      .filter(c => c.length > 0)
      .join('-');
    
    return components ? `${basePrefix}-${components}` : basePrefix;
  };

  const addVariant = () => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      attributes: attributeTypes.map(type => ({ type, value: '' })),
      stockCurrent: 0,
      stockMin: 0,
      purchasePrice: defaultPurchasePrice,
      salePrice: defaultSalePrice,
    };
    newVariant.generatedSku = generateSku(newVariant.attributes);
    onChange([...variants, newVariant]);
    
    // Focus sur le premier champ de la nouvelle variante
    setTimeout(() => {
      const firstInput = inputRefs.current[`${newVariant.id}-attr-0`];
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  const duplicateVariant = (variant: Variant) => {
    const duplicated: Variant = {
      ...variant,
      id: Date.now().toString(),
      generatedSku: generateSku(variant.attributes),
    };
    onChange([...variants, duplicated]);
    
    // Focus sur le premier champ de la variante dupliquée
    setTimeout(() => {
      const firstInput = inputRefs.current[`${duplicated.id}-attr-0`];
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    onChange(
      variants.map(v => {
        if (v.id === id) {
          const updated = { ...v, ...updates };
          // Re-générer le SKU si les attributs changent
          if (updates.attributes) {
            updated.generatedSku = generateSku(updated.attributes);
          }
          return updated;
        }
        return v;
      })
    );
  };

  const updateAttribute = (variantId: string, attributeIndex: number, value: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;

    const updatedAttributes = [...variant.attributes];
    updatedAttributes[attributeIndex] = {
      ...updatedAttributes[attributeIndex],
      value,
    };

    updateVariant(variantId, { attributes: updatedAttributes });
  };

  const addAttributeType = () => {
    const newType = prompt('Nom du nouvel attribut (ex: material, brand):');
    if (newType && newType.trim()) {
      setAttributeTypes([...attributeTypes, newType.trim().toLowerCase()]);
      onChange(
        variants.map(v => ({
          ...v,
          attributes: [...v.attributes, { type: newType.trim().toLowerCase(), value: '' }],
        }))
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, variantId: string, fieldIndex: number, fieldType: 'attr' | 'price' | 'stock') => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      // Navigation intelligente
      if (fieldType === 'attr') {
        const variant = variants.find(v => v.id === variantId);
        if (variant && fieldIndex < variant.attributes.length - 1) {
          // Passer au prochain attribut
          const nextInput = inputRefs.current[`${variantId}-attr-${fieldIndex + 1}`];
          if (nextInput) nextInput.focus();
        } else {
          // Passer au prix d'achat
          const priceInput = inputRefs.current[`${variantId}-purchasePrice`];
          if (priceInput) priceInput.focus();
        }
      } else if (fieldType === 'price' && fieldIndex === 0) {
        // Passer au prix de vente
        const salePriceInput = inputRefs.current[`${variantId}-salePrice`];
        if (salePriceInput) salePriceInput.focus();
      } else if (fieldType === 'price' && fieldIndex === 1) {
        // Passer au stock actuel
        const stockInput = inputRefs.current[`${variantId}-stockCurrent`];
        if (stockInput) stockInput.focus();
      } else if (fieldType === 'stock' && fieldIndex === 0) {
        // Passer au stock minimum
        const stockMinInput = inputRefs.current[`${variantId}-stockMin`];
        if (stockMinInput) stockMinInput.focus();
      } else if (fieldType === 'stock' && fieldIndex === 1) {
        // Passer à la variante suivante ou créer une nouvelle
        const currentIndex = variants.findIndex(v => v.id === variantId);
        if (currentIndex < variants.length - 1) {
          const nextVariant = variants[currentIndex + 1];
          const nextInput = inputRefs.current[`${nextVariant.id}-attr-0`];
          if (nextInput) nextInput.focus();
        } else {
          addVariant();
        }
      }
    }
  };

  const isVariantComplete = (variant: Variant): boolean => {
    return (
      variant.attributes.every(attr => attr.value.trim() !== '') &&
      variant.purchasePrice !== undefined &&
      variant.salePrice !== undefined &&
      variant.purchasePrice > 0 &&
      variant.salePrice > 0
    );
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec actions rapides */}
      <div className="flex items-center justify-between bg-brand/10 p-4 rounded-lg border border-border-default">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand" />
          <div>
            <h3 className="text-lg font-bold text-text-primary">Variantes du produit</h3>
            <p className="text-xs text-text-secondary">
              {variants.length} variante{variants.length !== 1 ? 's' : ''} • 
              {variants.filter(isVariantComplete).length} complète{variants.filter(isVariantComplete).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addAttributeType}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Attribut
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={addVariant}
            className="bg-brand hover:bg-brand-dark text-text-primary transition-colors duration-default ease-default"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter variante
          </Button>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-default rounded-xl bg-surface">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/20 flex items-center justify-center">
              <Plus className="w-8 h-8 text-brand" />
            </div>
            <h4 className="text-lg font-semibold text-text-primary mb-2">
              Aucune variante
            </h4>
            <p className="text-sm text-text-secondary mb-4">
              Commencez par ajouter votre première variante. Utilisez Tab/Enter pour naviguer rapidement.
            </p>
            <Button onClick={addVariant} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter la première variante
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((variant, index) => {
            const isComplete = isVariantComplete(variant);
            const margin = variant.salePrice && variant.purchasePrice 
              ? variant.salePrice - variant.purchasePrice 
              : 0;
            const marginPercent = variant.purchasePrice && variant.purchasePrice > 0
              ? ((margin / variant.purchasePrice) * 100).toFixed(1)
              : '0';

            return (
              <div
                key={variant.id}
                className={`relative border-2 rounded-xl p-5 transition-all duration-200 group ${
                  isComplete
                    ? 'border-success/50 bg-success/10'
                    : focusedVariant === variant.id
                    ? 'border-brand bg-brand/10 shadow-glow-primary'
                    : 'border-border-default bg-card hover:border-border-subtle'
                }`}
                onFocus={() => setFocusedVariant(variant.id)}
                onBlur={() => setFocusedVariant(null)}
              >
                {/* Badge de statut */}
                {isComplete && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded-full text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Complète
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateVariant(variant)}
                    title="Dupliquer (Ctrl+D)"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeVariant(variant.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Numéro de variante */}
                <div className="mb-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand/20 text-brand font-bold text-sm">
                    {index + 1}
                  </span>
                </div>

                {/* Attributs en ligne compacte */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {variant.attributes.map((attr, attrIndex) => (
                    <div key={attrIndex} className="relative">
                      <label className="block text-xs font-semibold text-text-primary mb-1 uppercase tracking-wide">
                        {attr.type}
                      </label>
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current[`${variant.id}-attr-${attrIndex}`] = el;
                        }}
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateAttribute(variant.id, attrIndex, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, variant.id, attrIndex, 'attr')}
                        placeholder={attr.type === 'color' ? 'NOIR' : attr.type === 'size' ? 'M' : 'Valeur'}
                        list={`suggestions-${attr.type}-${variant.id}`}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default transition-all duration-default ease-default"
                      />
                      <datalist id={`suggestions-${attr.type}-${variant.id}`}>
                        {suggestions[attr.type]?.map((suggestion, i) => (
                          <option key={i} value={suggestion} />
                        ))}
                      </datalist>
                    </div>
                  ))}
                </div>

                {/* SKU généré */}
                {variant.generatedSku && (
                  <div className="mb-4 p-2 bg-elevated rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">SKU généré:</span>
                      <span className="text-sm font-mono font-bold text-brand">
                        {variant.generatedSku}
                      </span>
                    </div>
                  </div>
                )}

                {/* Prix et stock en grille compacte */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Prix achat *
                    </label>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[`${variant.id}-purchasePrice`] = el;
                      }}
                      type="number"
                      step="0.01"
                      required
                      value={variant.purchasePrice || ''}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      onKeyDown={(e) => handleKeyDown(e, variant.id, 0, 'price')}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Prix vente *
                    </label>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[`${variant.id}-salePrice`] = el;
                      }}
                      type="number"
                      step="0.01"
                      required
                      value={variant.salePrice || ''}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          salePrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      onKeyDown={(e) => handleKeyDown(e, variant.id, 1, 'price')}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
                    />
                  </div>
                  {variant.purchasePrice && variant.salePrice && (
                    <div className="flex items-end">
                      <div className="w-full p-2 bg-info/10 rounded-lg">
                        <div className="text-xs text-text-secondary">Marge</div>
                        <div className="text-sm font-bold text-info">
                          {margin.toFixed(2)} {currencyLabel} ({marginPercent}%)
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Stock actuel
                    </label>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[`${variant.id}-stockCurrent`] = el;
                      }}
                      type="number"
                      value={variant.stockCurrent}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          stockCurrent: parseInt(e.target.value) || 0,
                        })
                      }
                      onKeyDown={(e) => handleKeyDown(e, variant.id, 0, 'stock')}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
                    />
                  </div>
                </div>

                {/* Stock minimum et code-barres */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Stock minimum
                    </label>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[`${variant.id}-stockMin`] = el;
                      }}
                      type="number"
                      value={variant.stockMin}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          stockMin: parseInt(e.target.value) || 0,
                        })
                      }
                      onKeyDown={(e) => handleKeyDown(e, variant.id, 1, 'stock')}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Code-barres
                    </label>
                    <input
                      type="text"
                      value={variant.barcode || ''}
                      onChange={(e) =>
                        updateVariant(variant.id, {
                          barcode: e.target.value || undefined,
                        })
                      }
                      placeholder="Optionnel"
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand border-border-default"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raccourcis clavier et statistiques */}
      {variants.length > 0 && (
        <div className="mt-4 p-4 bg-surface rounded-lg border border-border-default">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-success" />
                <span>{variants.filter(isVariantComplete).length} complète{variants.filter(isVariantComplete).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                <span>{variants.length - variants.filter(isVariantComplete).length} en cours</span>
              </div>
            </div>
            <div className="text-xs text-text-muted">
              <strong>Raccourcis:</strong> Tab/Enter pour naviguer • Cliquez sur <Copy className="w-3 h-3 inline" /> pour dupliquer
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
