import { useState, useEffect, useMemo, useRef } from 'react';
import { useInfiniteProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
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
import { Search, Package, Check, Plus, Minus, X, LayoutGrid } from 'lucide-react';
import { Product, Category } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/format';
import { getImageUrl } from '@/lib/utils/url';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Categories data
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Infinite Scroll Hook
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteProducts({ 
    search: debouncedSearch, 
    categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
    limit: 20,
    isActive: true 
  });

  const products = useMemo(() => {
    return data?.pages.flatMap(page => page.data.products || []) || [];
  }, [data]);

  // Handle Scroll for Infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  /** Returns the effective stock: sum of all variant stocks if the product has variants, otherwise main stock */
  const getEffectiveStock = (product: Product): number => {
    let vars = product.variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = []; }
    }
    if (vars && Array.isArray(vars) && vars.length > 0) {
      return vars.reduce((sum: number, v: any) => {
        const s = typeof v === 'object' && (v as any).stock !== undefined ? Number((v as any).stock) : 0;
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
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Pilih Produk
          </DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama produk, SKU, atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* Categories Tab Bar */}
        <div className="px-4 py-2 border-b bg-muted/10 shrink-0">
          <Tabs value={selectedCategoryId} onValueChange={setSelectedCategoryId} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 flex justify-start gap-1 overflow-x-auto no-scrollbar">
              <TabsTrigger 
                value="all" 
                className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border"
              >
                Semua
              </TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border whitespace-nowrap"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/10 custom-scrollbar"
        >
          {isLoading && products.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-14 w-14 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-10 w-10 opacity-20" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Tidak ditemukan</h3>
              <p className="max-w-[250px] mx-auto text-sm">Coba kata kunci lain atau pilih kategori berbeda.</p>
            </div>
          ) : (
            <>
              {products.map((product) => {
                const isSelected = !!selectedItems[product.id];
                const quantity = selectedItems[product.id] || 0;
                const variantStr = getVariantString(product.variants);
                const stock = getEffectiveStock(product);
                const isOutOfStock = stock <= 0;
                const canSelect = allowOutOfStock || !isOutOfStock;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                        if (canSelect) handleToggleProduct(product.id)
                    }}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden",
                      isSelected 
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md translate-x-1" 
                          : "border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer",
                      !canSelect && "opacity-60 grayscale cursor-not-allowed"
                    )}
                  >
                    {/* Selection Indicator */}
                    <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        isSelected 
                            ? "bg-primary border-primary scale-110 shadow-sm" 
                            : "border-muted-foreground/30 group-hover:border-primary/50"
                    )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />}
                    </div>

                    {/* Image with Fallback & Skeleton */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden border bg-muted shrink-0 relative shadow-inner">
                        <ImageWithFallback 
                            src={getImageUrl(product.imageUrl)} 
                            alt={product.name} 
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                          <h4 className={cn(
                              "font-bold text-base truncate transition-colors", 
                              isSelected ? "text-primary" : "text-foreground"
                          )}>
                              {product.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono py-0.5 px-1.5 bg-muted rounded text-muted-foreground uppercase">{product.sku}</span>
                              {variantStr && (
                                  <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-semibold bg-blue-500/10 text-blue-600 border-none">
                                      {variantStr}
                                  </Badge>
                              )}
                              {isOutOfStock ? (
                                  <Badge variant="destructive" className="text-[10px] px-2 py-0 h-5 font-semibold border-none">Stok Habis</Badge>
                              ) : (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-semibold text-muted-foreground border-slate-200">
                                      Stok: {stock}
                                  </Badge>
                              )}
                          </div>
                      </div>
                    </div>

                    {/* Quantity Selector - Overlay style for selected */}
                    {isSelected && (
                        <div 
                          className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border animate-in zoom-in-95 duration-200"
                          onClick={(e) => e.stopPropagation()} // Prevent deselecting when clicking controls
                        >
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500" 
                                onClick={() => updateQuantity(product.id, -1)}
                                disabled={quantity <= 1}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <div className="w-10 text-center font-bold text-sm">
                                {quantity}
                            </div>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg hover:bg-green-50 hover:text-green-500" 
                                onClick={() => updateQuantity(product.id, 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator for infinite scroll */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="ml-2 text-xs text-muted-foreground font-medium">Memuat baris berikutnya...</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-card/80 backdrop-blur-md">
            <div className="flex items-center justify-between w-full gap-4">
                <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                        {selectedCount} barang dipilih
                    </span>
                    <p className="text-[10px] text-muted-foreground">Klik simpan untuk melanjutkan</p>
                </div>
                <div className="flex flex-1 sm:flex-none gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => setOpen(false)}
                        className="flex-1 sm:flex-none rounded-xl h-11 px-6 border-slate-200 font-semibold"
                    >
                        Batal
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={selectedCount === 0}
                        className="flex-1 sm:flex-none rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        Tambahkan ({selectedCount})
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
