'use client';

import { useState } from 'react';
import { useProducts } from '@/lib/hooks/useProducts';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateStockAdjustment, useCreateStockRequest } from '@/lib/hooks/useStock';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Package, AlertTriangle, CheckCircle2,
  ArrowUp, ArrowDown, Loader2, SlidersHorizontal, ClipboardCheck, Info,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getEffectiveStock = (product: any): number => {
  let vars = product.variants;
  if (typeof vars === 'string') {
    try { vars = JSON.parse(vars); } catch { vars = []; }
  }
  if (vars && Array.isArray(vars) && vars.length > 0) {
    return vars.reduce((s: number, v: any) => s + (typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : 0), 0);
  }
  return Number(product.stock) || 0;
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
    typeof value === 'string' ? parseFloat(value) : value
  );

const getStockStatus = (stock: number, minStock: number) => {
  if (stock <= 0) return { label: 'Habis', color: 'destructive', icon: AlertTriangle };
  if (stock <= minStock) return { label: 'Menipis', color: 'warning', icon: AlertTriangle };
  return { label: 'Aman', color: 'success', icon: CheckCircle2 };
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TotalStockPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Adjustment form state
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjVariant, setAdjVariant] = useState<string | null>(null);
  const [adjQuantity, setAdjQuantity] = useState<number>(1);
  const [adjNotes, setAdjNotes] = useState('');

  const { data, isLoading } = useProducts({ limit: 1000 });

  const adjustMutation = useCreateStockAdjustment();
  const requestMutation = useCreateStockRequest();

  const products = (data?.data?.products || []).filter((p: any) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
  });

  const openAdjustment = (product: any) => {
    setSelectedProduct(product);
    setAdjType('IN');
    
    // Auto-select first variant if exists
    let vars = product.variantItems || [];
    if (vars.length > 0) {
        setAdjVariant(vars[0].value);
    } else {
        setAdjVariant(null);
    }

    setAdjQuantity(1);
    setAdjNotes('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedProduct || adjQuantity <= 0) return;

    const payload = {
      productId: selectedProduct.id,
      variantName: adjVariant || undefined,
      quantity: adjQuantity,
      type: adjType,
      notes: adjNotes || undefined,
    };

    if (isAdmin) {
      // Admin: direct adjustment, logged immediately
      adjustMutation.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedProduct(null);
        },
      });
    } else {
      // User: submit as approval request
      requestMutation.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedProduct(null);
        },
      });
    }
  };

  const isPending = adjustMutation.isPending || requestMutation.isPending;
  
  // Calculate shown stock for adjustment modal
  const getSelectedStock = () => {
    if (!selectedProduct) return 0;
    if (adjVariant) {
        const variant = (selectedProduct.variantItems || []).find((v: any) => v.value === adjVariant);
        return variant ? Number(variant.stock) : 0;
    }
    return getEffectiveStock(selectedProduct);
  };
  const currentStockShown = getSelectedStock();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Stok Keseluruhan</h1>
          <p className="text-muted-foreground mt-1">
            Lihat stok semua produk secara real-time dan lakukan penyesuaian stok
          </p>
        </div>
      </div>

      {/* Info for USER */}
      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Pengajuan Penyesuaian Stok:</strong> Untuk pengguna biasa, setiap permintaan penyesuaian stok akan dikirim ke Admin untuk disetujui terlebih dahulu sebelum diterapkan.
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau SKU produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{products.length} produk ditemukan</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Status Stok</TableHead>
              <TableHead className="text-right">Sisa Stok</TableHead>
              <TableHead className="text-right">Min Stok</TableHead>
              <TableHead className="text-center">Satuan</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <span className="loading loading-spinner loading-md" />
                  <p className="text-sm mt-2">Memuat data stok...</p>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <Package className="h-12 w-12" />
                    <p>Tidak ada produk ditemukan</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: any) => {
                const effectiveStock = getEffectiveStock(product);
                const status = getStockStatus(effectiveStock, product.minStock || 5);
                return (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium text-muted-foreground">
                      {product.sku || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.color as any} className="gap-1">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={cn(
                            'font-bold text-lg',
                            effectiveStock <= 0 ? 'text-destructive' :
                            effectiveStock <= (product.minStock || 5) ? 'text-warning' : 'text-primary'
                          )}
                        >
                          {effectiveStock}
                        </span>
                        {(() => {
                           let vars: any[] = [];
                           if (Array.isArray(product.variantItems) && product.variantItems.length > 0) {
                              vars = product.variantItems;
                           } else {
                              if (typeof product.variants === 'string') {
                                try { vars = JSON.parse(product.variants); } catch { vars = []; }
                              } else if (Array.isArray(product.variants)) {
                                vars = product.variants;
                              }
                           }

                           if (vars && vars.length > 0) {
                             return (
                               <div className="flex gap-1 flex-wrap justify-end mt-1 max-w-[150px]">
                                 {vars.map((v: any, i: number) => {
                                   const vStock = Number(v.stock) || 0;
                                   return (
                                     <Badge 
                                        key={i} 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] px-1 py-0 h-4 leading-none font-normal",
                                          vStock <= 0 ? "border-red-200 text-red-600 bg-red-50" : "border-slate-200 text-slate-600 bg-slate-50"
                                        )}
                                      >
                                        {v.value || v.name}: {vStock}
                                      </Badge>
                                   );
                                 })}
                               </div>
                             );
                           }
                           return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {product.minStock || 5}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {product.unit || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm opacity-80">
                      {formatCurrency(product.sellingPrice || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => openAdjustment(product)}
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Sesuaikan
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdmin ? (
                <><SlidersHorizontal className="h-5 w-5 text-primary" /> Penyesuaian Stok</>
              ) : (
                <><ClipboardCheck className="h-5 w-5 text-blue-500" /> Ajukan Penyesuaian Stok</>
              )}
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? 'Penyesuaian akan langsung diterapkan dan dicatat di riwayat stok.'
                : 'Permintaan akan dikirim ke Admin untuk disetujui terlebih dahulu.'}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-5 py-2">
              {/* Product info */}
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-card border p-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{selectedProduct.name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {selectedProduct.sku || '-'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Stok {adjVariant ? 'Varian' : 'Total'}:</span>
                      <span className={cn(
                        'text-sm font-bold',
                        currentStockShown <= 0 ? 'text-destructive' : 'text-primary'
                      )}>
                        {currentStockShown} {selectedProduct.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant Selector */}
              {selectedProduct.variantItems && selectedProduct.variantItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Pilih Varian *</Label>
                  <Select value={adjVariant || ''} onValueChange={setAdjVariant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih varian produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.variantItems.map((v: any) => (
                        <SelectItem key={v.id} value={v.value}>
                          {v.value} (Stok: {v.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Type */}
              <div className="space-y-2">
                <Label>Tipe Penyesuaian *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjType('IN')}
                    className={cn(
                      'flex items-center gap-2 border-2 rounded-xl p-3 text-left transition-all text-sm',
                      adjType === 'IN'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                        : 'border-border hover:border-green-300'
                    )}
                  >
                    <ArrowUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Stok Masuk (+)</div>
                      <div className="text-xs opacity-70">Tambah jumlah stok</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('OUT')}
                    className={cn(
                      'flex items-center gap-2 border-2 rounded-xl p-3 text-left transition-all text-sm',
                      adjType === 'OUT'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'border-border hover:border-red-300'
                    )}
                  >
                    <ArrowDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Stok Keluar (-)</div>
                      <div className="text-xs opacity-70">Kurangi jumlah stok</div>
                    </div>
                  </button>
                </div>
              </div>

               {/* Quantity */}
               <div className="space-y-2">
                 <Label>Jumlah *</Label>
                 <Input
                   type="number"
                   min={1}
                   value={adjQuantity}
                   onChange={(e) => setAdjQuantity(Math.max(1, Number(e.target.value)))}
                   placeholder="0"
                 />
                 {adjType === 'OUT' && adjQuantity > currentStockShown && (
                   <p className="text-xs text-destructive flex items-center gap-1">
                     <AlertTriangle className="h-3.5 w-3.5" />
                     Jumlah melebihi stok {adjVariant ? 'varian' : ''} saat ini ({currentStockShown})
                   </p>
                 )}
                 {adjQuantity > 0 && (
                   <p className="text-xs text-muted-foreground">
                     Stok setelah penyesuaian:{' '}
                     <strong className={cn(
                       adjType === 'OUT' && currentStockShown - adjQuantity <= 0 ? 'text-destructive' : 'text-primary'
                     )}>
                       {adjType === 'IN' ? currentStockShown + adjQuantity : currentStockShown - adjQuantity}
                     </strong>
                     {' '}{selectedProduct.unit}
                   </p>
                 )}
               </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{!isAdmin ? 'Alasan Pengajuan *' : 'Catatan'}</Label>
                <Textarea
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder={!isAdmin ? 'Jelaskan alasan penyesuaian stok ini...' : 'Alasan/keterangan penyesuaian (opsional)'}
                  rows={3}
                />
              </div>

              {/* Role info */}
              {!isAdmin && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Permintaan ini akan masuk ke halaman <strong>Persetujuan → Data Master</strong> dan perlu disetujui Admin sebelum diterapkan.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedProduct ||
                isPending ||
                adjQuantity <= 0 ||
                (!isAdmin && !adjNotes.trim()) ||
                (adjType === 'OUT' && adjQuantity > currentStockShown) ||
                (selectedProduct?.variantItems && selectedProduct.variantItems.length > 0 && !adjVariant)
              }
              className={isAdmin ? '' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
              ) : isAdmin ? (
                <><SlidersHorizontal className="h-4 w-4 mr-2" /> Terapkan Sekarang</>
              ) : (
                <><ClipboardCheck className="h-4 w-4 mr-2" /> Kirim Pengajuan</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
