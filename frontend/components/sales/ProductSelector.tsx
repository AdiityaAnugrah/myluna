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
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, Package, AlertTriangle, Check } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/format';
import { PreviewableImage } from '@/components/ui/previewable-image';

interface ProductSelectorProps {
  onSelect: (productId: string) => void;
  selectedProductId?: string;
  disabled?: boolean;
  /** When true, products with zero stock can still be selected (e.g., for stock adjustment) */
  allowOutOfStock?: boolean;
}

export function ProductSelector({ onSelect, selectedProductId, disabled, allowOutOfStock = false }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
  const selectedProduct = products.find(p => p.id === selectedProductId);

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

  const handleSelect = (product: Product) => {
    onSelect(product.id);
    setOpen(false);
    setSearch(''); // Reset search
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedProductId && selectedProduct ? (
            <span className="flex items-center gap-2 truncate">
              <Package className="h-4 w-4 text-muted-foreground" />
              {selectedProduct.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih produk...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Pilih Produk</DialogTitle>
          <DialogDescription className="hidden">
            Cari dan pilih produk dari daftar inventaris.
          </DialogDescription>
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

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
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
              const stock = getEffectiveStock(product);
              const isLowStock = stock <= product.minStock && stock > 0;
              const isOutOfStock = stock <= 0;
              const canSelect = allowOutOfStock || !isOutOfStock;
              const isSelected = product.id === selectedProductId;

              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors relative",
                    isSelected ? "border-primary bg-primary/10" : "border-border",
                    canSelect ? "cursor-pointer hover:bg-muted" : "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (canSelect) handleSelect(product);
                  }}
                >
                  {/* Image Placeholder or Actual Image */}
                  <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden border">
                    {product.imageUrl ? (
                       <div onClick={(event) => event.stopPropagation()}>
                         <PreviewableImage src={product.imageUrl} alt={product.name} className="h-16 w-16 border-0" />
                       </div>
                    ) : (
                       <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm truncate pr-2">{product.name}</h4>
                        <p className="text-xs text-muted-foreground mb-1">{product.sku}</p>
                      </div>
                      <p className="font-bold text-primary text-sm whitespace-nowrap">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-normal">
                        {product.category?.name || 'Uncategorized'}
                      </Badge>

                      {(() => {
                        let vars = product.variants;
                        if (typeof vars === 'string') {
                          try { vars = JSON.parse(vars); } catch (e) { vars = []; }
                        }
                        if (vars && Array.isArray(vars) && vars.length > 0) {
                          return (
                            <Badge variant="secondary" className="text-xs font-normal bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                              {vars.length} Varian
                            </Badge>
                          );
                        }
                        return null;
                      })()}

                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-green-600"
                      )}>
                        {isOutOfStock ? (
                          <>Stok Habis ({stock})</>
                        ) : (
                          <>
                             {isLowStock && <AlertTriangle className="h-3 w-3" />}
                             Stok: {stock}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2">
                       <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                       </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
