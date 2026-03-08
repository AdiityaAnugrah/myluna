import { useState, useEffect } from 'react';
import { useProducts } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Package, Check, Plus, Minus, X } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/format';
import { getImageUrl } from '@/lib/utils/url';

interface BulkProductSelectorProps {
  onSelect: (items: { productId: string; quantity: number }[]) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  /** When true, products with zero stock can still be selected (e.g., for stock adjustment) */
  allowOutOfStock?: boolean;
}

export function BulkProductSelector({ onSelect, trigger, disabled, allowOutOfStock = false }: BulkProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useProducts({ 
    search: debouncedSearch, 
    limit: 50,
    isActive: true 
  });

  const products = data?.data?.products || [];

  /** Returns the effective stock: sum of all variant stocks if the product has variants, otherwise main stock */
  const getEffectiveStock = (product: Product): number => {
    let vars = product.variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = []; }
    }
    if (vars && Array.isArray(vars) && vars.length > 0) {
      return vars.reduce((sum: number, v: any) => {
        const s = typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : 0;
        return sum + s;
      }, 0);
    }
    return Number(product.stock) || 0;
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedItems(prev => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      } else {
        return { ...prev, [productId]: 1 };
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const setQuantity = (productId: string, val: number) => {
      setSelectedItems(prev => ({ ...prev, [productId]: Math.max(1, val) }));
  }

  const handleConfirm = () => {
    const result = Object.entries(selectedItems).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    onSelect(result);
    setOpen(false);
    setSelectedItems({});
    setSearch('');
  };

  const getVariantString = (variants: any) => {
      if (!variants) return null;
      if (Array.isArray(variants)) return `${variants.length} Varian`;
      try {
          const parsed = typeof variants === 'string' ? JSON.parse(variants) : variants;
          if (Array.isArray(parsed)) return `${parsed.length} Varian`;
      } catch { return null; }
      return null;
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Barang
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Pilih Produk</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama produk, SKU, atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 dark:bg-slate-900/10">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="loading loading-spinner loading-md"></span> Memuat produk...
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
              <Package className="h-12 w-12 opacity-20 mb-2" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          ) : (
            products.map((product) => {
              const isSelected = !!selectedItems[product.id];
              const quantity = selectedItems[product.id] || 0;
              const variantStr = getVariantString(product.variants);
              const stock = getEffectiveStock(product);
              const isOutOfStock = stock <= 0;
              const canSelect = allowOutOfStock || !isOutOfStock;

              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all relative",
                    isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-card",
                    !isSelected && canSelect ? "hover:border-primary/50 cursor-pointer" : "",
                    !canSelect ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  {/* Selection Checkbox Area */}
                  <div 
                    className="self-stretch flex items-center"
                    onClick={() => {
                      if (canSelect) handleToggleProduct(product.id)
                    }}
                  >
                      <div className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                      )}>
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                  </div>

                  {/* Image */}
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden border">
                    {product.imageUrl ? (
                       // eslint-disable-next-line @next/next/no-img-element
                       <img src={getImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                       <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => {
                    if (!isSelected && canSelect) handleToggleProduct(product.id);
                  }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className={cn("font-medium text-sm truncate", isSelected && "text-primary")}>
                                {product.name}
                            </h4>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                                {variantStr && (
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5">{variantStr}</Badge>
                                )}
                                {isOutOfStock ? (
                                    <Badge variant="destructive" className="text-[10px] px-1 h-5">Stok Habis</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] px-1 h-5 text-muted-foreground">Stok: {stock}</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Quantity Controls (Only visible if selected) */}
                  {isSelected && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8" 
                            onClick={() => updateQuantity(product.id, -1)}
                            disabled={quantity <= 1}
                          >
                              <Minus className="h-3 w-3" />
                          </Button>
                          <Input 
                            className="w-16 h-8 text-center" 
                            type="number" 
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(product.id, parseInt(e.target.value) || 1)}
                          />
                           <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8" 
                            onClick={() => updateQuantity(product.id, 1)}
                          >
                              <Plus className="h-3 w-3" />
                          </Button>
                      </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-card">
            <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">
                    {selectedCount} barang dipilih
                </span>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleConfirm} disabled={selectedCount === 0}>
                        Tambahkan ({selectedCount})
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
