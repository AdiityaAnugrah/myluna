'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useCreatePurchase } from '@/lib/hooks/usePurchases';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { useProducts } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';



import { ProductSelector } from '@/components/sales/ProductSelector';
import { BulkProductSelector } from '@/components/sales/BulkProductSelector';
import { formatCurrency, getVariants } from '@/lib/utils/sales';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';

interface PurchaseItem {
  productId: string;
  variantName?: string | null;
  quantity: number;
  price?: number;
}


export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createMutation = useCreatePurchase();
  const formStartTime = useRef<number>(Date.now()); // track how long form was open
  const { data: suppliersData } = useSuppliers(undefined, { enabled: user?.role !== 'TCP' });
  const { data: productsData } = useProducts({ limit: 100 }, { enabled: user?.role !== 'TCP' });

  const suppliers = suppliersData?.data?.suppliers || [];
  const products = productsData?.data?.products || [];
  const isUser = user?.role === 'USER';

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => getTodayDateInputValue());
  const [items, setItems] = useState<PurchaseItem[]>([]);

  if (user?.role === 'TCP') {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border shadow-lg max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">Akses Ditolak</h3>
                    <p className="text-muted-foreground mt-2">
                        Kamu tidak mempunyai akses ke fitur itu.
                    </p>
                </div>
                <Button onClick={() => router.push('/')} variant="default" className="w-full">
                    Kembali ke Dashboard
                </Button>
            </div>
        </div>
    );
  }

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const isFormValid = items.length > 0 && items.every((item) => {
    if (!item.productId) return false;
    if (item.quantity <= 0) return false;
    if (item.price === undefined || item.price < 0) return false;
    
    // Check if variant is required but missing
    const product = products.find(p => p.id === item.productId);
    const variants = getVariants(product?.variants);
    if (variants.length > 0 && !item.variantName) {
      return false;
    }
    return true;
  });

  const isDirty = supplierId !== '' || items.length > 0;
  useConfirmPageLeave(isDirty, () => {
    setNextPath(null);
    setLeaveConfirmOpen(true);
  });

  const cancelLeave = () => {
    if (isDirty && !nextPath) {
      window.history.pushState(null, '', window.location.pathname);
    }
    setNextPath(null);
    setLeaveConfirmOpen(false);
  };

  const handleBack = (e: React.MouseEvent, href: string) => {
    if (isDirty) {
      e.preventDefault();
      setNextPath(href);
      setLeaveConfirmOpen(true);
    }
  };

  const confirmLeave = () => {
    if (nextPath) {
      router.push(nextPath);
    } else {
      router.back();
    }
  };

  const handleBulkSelect = (selectedItems: { productId: string; quantity: number }[]) => {
    // For purchases: always add as new rows (no dedup by productId).
    // Same product can appear multiple times with different variants.
    const newRows = selectedItems.map(selection => {
      const product = products.find(p => p.id === selection.productId);
      const price = product?.purchasePrice || 0;
      return {
        productId: selection.productId,
        variantName: null as string | null,
        quantity: selection.quantity,
        price: typeof price === 'string' ? parseFloat(price) : price,
      };
    });

    setItems(prev => [...prev, ...newRows]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };
  
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const price = product?.purchasePrice
      ? (typeof product.purchasePrice === 'string' ? parseFloat(product.purchasePrice) : product.purchasePrice)
      : 0;
    // Single atomic update to avoid race conditions with stale state
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], productId, variantName: null, price };
      return newItems;
    });
  };

  const formatVariants = (variants: any) => {
      if (!variants) return '-';
      if (Array.isArray(variants)) return variants.join(', ');
      if (typeof variants === 'string') {
          try {
              const parsed = JSON.parse(variants);
              if (Array.isArray(parsed)) return parsed.join(', ');
          } catch {
              return variants;
          }
      }
      return '-';
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * (item.price || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error('Mohon pilih pemasok');
      return;
    }


    if (items.length === 0) {
      toast.error('Mohon tambahkan setidaknya satu barang');
      return;
    }


    const invalidItems = items.filter((item) => !item.productId || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('Mohon isi semua data barang dengan benar');
      return;
    }


    const durationSeconds = Math.round((Date.now() - formStartTime.current) / 1000);
    createMutation.mutate(
      {
        supplierId,
        purchaseDate: isUser ? getTodayDateInputValue() : purchaseDate,
        duration: durationSeconds,
        items: items.map((item) => ({
          productId: item.productId,
          variantName: item.variantName || null,
          quantity: item.quantity,
          price: (item.price || 0).toString(),
        })),
      },
      {
        onSuccess: () => router.push('/purchases'),
      }
    );
  };

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'Pembelian', href: '/purchases' }, { label: 'Pembelian Baru' }]}
      />
      <div className="flex items-center gap-4">
        <Link href="/purchases" onClick={(e) => handleBack(e, '/purchases')}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>


        <div>
          <h1 className="text-3xl font-bold">Pesanan Pembelian Baru</h1>
          <p className="text-gray-600 mt-1">Buat pesanan pembelian baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Pemasok *</Label>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pemasok" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Tanggal Pembelian *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={isUser ? getTodayDateInputValue() : purchaseDate}
                  onChange={(e) => {
                    if (!isUser) setPurchaseDate(e.target.value);
                  }}
                  disabled={isPending}
                  {...getUserTodayDateInputProps(isUser)}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Barang</CardTitle>
            <BulkProductSelector 
                onSelect={handleBulkSelect} 
                disabled={isPending}
                allowOutOfStock={true}
                trigger={
                    <Button type="button" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Barang
                    </Button>
                }
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Varian/Warna</TableHead>
                  <TableHead className="w-32">Jumlah</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Belum ada barang ditambahkan. Klik "Tambah Barang" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <ProductSelector
                          selectedProductId={item.productId}
                          onSelect={(value) => handleProductSelect(index, value)}
                          disabled={isPending}
                          allowOutOfStock={true}
                        />
                      </TableCell>
                      <TableCell>
                          {(() => {
                              const product = products.find(p => p.id === item.productId);
                              let variantsArray = product?.variants;
                              if (typeof variantsArray === 'string') {
                                try { variantsArray = JSON.parse(variantsArray); } catch (e) { variantsArray = []; }
                              }
                              const hasVariants = variantsArray && Array.isArray(variantsArray) && variantsArray.length > 0;
                              if (!hasVariants) {
                                  return <span className="text-gray-400 text-sm">-</span>;
                              }
                              return (
                                  <Select
                                    value={item.variantName || ''}
                                    onValueChange={(val) => updateItem(index, 'variantName', val)}
                                    disabled={isPending}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Pilih Varian" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {variantsArray?.map((v: any, i: number) => {
                                        // Show just the color value (e.g. "PUTIH") as the label
                                        const variantLabelRaw = typeof v === 'string' ? v : (v.value || v.name || 'Unknown');
                                        const variantLabel = String(variantLabelRaw);
                                        const stockNum = typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : undefined;
                                        const stockText = stockNum !== undefined ? ` (Stok: ${stockNum})` : '';
                                        
                                        // Check if this variant is already selected in another row
                                        const isAlreadySelected = items.some((otherItem, otherIndex) => 
                                            otherIndex !== index && 
                                            otherItem.productId === item.productId && 
                                            otherItem.variantName === variantLabel
                                        );
                                        
                                        const isOutOfStock = stockNum !== undefined && stockNum <= 0;
                                        const isDisabled = isAlreadySelected; // Note: For purchases, we might not always strictly prevent out of stock, but duplicate selection should definitely be prevented
                                        
                                        return (
                                          <SelectItem 
                                            key={`${variantLabel}-${i}`} 
                                            value={variantLabel}
                                            disabled={isDisabled}
                                            className={isDisabled ? "opacity-50" : ""}
                                          >
                                            {variantLabel}{stockText}{isAlreadySelected ? ' (Sudah Dipilih)' : ''}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                              );
                          })()}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>



          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending || !isFormValid}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Membuat Pembelian...
              </>
            ) : (
              'Buat Pembelian'
            )}
          </Button>
          <Link href="/purchases" onClick={(e) => handleBack(e, '/purchases')}>
            <Button type="button" variant="outline" disabled={isPending}>
              Batal
            </Button>
          </Link>


        </div>
      </form>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        title="Tinggalkan Halaman?"
        description="Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?"
        confirmText="Tinggalkan"
        cancelText="Tetap di Sini"
        variant="destructive"
      />
    </div>

  );
}
