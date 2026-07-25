'use client';

import { useState, useEffect, useMemo } from 'react';

import { useRouter } from 'next/navigation';
import { useSale, useUpdateSale } from '@/lib/hooks/useSales';
import { useAuthStore } from '@/lib/stores/auth';
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
import { use } from 'react';
import { toast } from 'sonner';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';






interface SaleItem {
  productId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
}

export default function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: saleData, isLoading: loadingSale } = useSale(id);
  const updateMutation = useUpdateSale();
  const { data: productsData } = useProducts({ limit: 100 });

  const products = productsData?.data?.products || [];
  const sale = saleData?.data;
  const isUser = user?.role === 'USER';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CREDIT'>('CASH');
  const [saleDate, setSaleDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Compare current state with initial sale data to determine if dirty
  const isDirty = useMemo(() => {
    if (!sale || !initialDataLoaded) return false;
    
    return (
      customerName !== (sale.customerName || '') ||
      customerPhone !== (sale.customerPhone || '') ||
      notes !== (sale.notes || '') ||
      paymentMethod !== sale.paymentMethod ||
      saleDate !== sale.saleDate.split('T')[0] ||
      items.length !== (sale.items?.length || 0)
    );
  }, [customerName, customerPhone, notes, paymentMethod, saleDate, items, sale, initialDataLoaded]);

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

  useEffect(() => {
    if (sale) {
      setCustomerName(sale.customerName || '');
      setCustomerPhone(sale.customerPhone || '');
      setPaymentMethod(sale.paymentMethod);
      setSaleDate(sale.saleDate.split('T')[0]);
      setNotes(sale.notes || '');
      setItems(
        sale.items?.map((item) => ({
          productId: item.productId || '',
          variantName: item.variantName || null,
          quantity: item.quantity,
          price: typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price),
        })) || []
      );
      setInitialDataLoaded(true);
    }
  }, [sale]);

  const handleBulkSelect = (selectedItems: { productId: string; quantity: number }[]) => {
    const newItems = [...items];

    selectedItems.forEach(selection => {
        const product = products.find(p => p.id === selection.productId);
        const price = product ? parseFloat(product.sellingPrice) : 0;
        
        let hasVariants = false;
        if (product) {
            let vars = product.variants;
            if (typeof vars === 'string') {
              try { vars = JSON.parse(vars); } catch { vars = []; }
            }
            if (Array.isArray(vars) && vars.length > 0) hasVariants = true;
        }

        // Find existing index. Only merge if the product has NO variants.
        // If it has variants, we always create a new row so the user can select different variants.
        const existingIndex = newItems.findIndex(i => i.productId === selection.productId);
        
        if (existingIndex >= 0 && !hasVariants) {
            newItems[existingIndex].quantity += selection.quantity;
        } else {
            newItems.push({
                productId: selection.productId,
                variantName: null,
                quantity: selection.quantity,
                price: price,
            });
        }
    });

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Fixed updateItem to accept multiple field updates at once to prevent stale state closures
  const updateItemFields = (index: number, updates: Partial<SaleItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Auto-fill selling price when product is selected
    if ('productId' in updates && updates.productId) {
      const product = products.find((p) => p.id === updates.productId);
      if (product) {
        newItems[index].price = parseFloat(product.sellingPrice);
      }
    }
    
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
      updateItemFields(index, { [field]: value });
  };

  const addItem = () => {
    setItems([...items, { productId: '', variantName: null, quantity: 1, price: 0 }]);
  };

  const getProductStock = (productId: string, variantName?: string | null) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    if (variantName) {
      let variantsArray = product.variants;
      if (typeof variantsArray === 'string') {
        try { variantsArray = JSON.parse(variantsArray); } catch { variantsArray = []; }
      }
      if (Array.isArray(variantsArray)) {
        const variant = variantsArray.find((v: any) => {
          const rawLabel = typeof v === 'string' ? v : (v.value || (v.name ? `${v.name}: ${v.value}` : ''));
          return String(rawLabel) === String(variantName);
        });
        if (variant && typeof variant === 'object' && variant.stock !== undefined) {
          return Number(variant.stock);
        }
      }
    }
    return Number(product.stock) || 0;
  };

  const isFormValid = items.length > 0 && items.every((item) => {
    if (!item.productId) return false;
    if (item.quantity <= 0) return false;
    if (item.price < 0) return false;
    
    // Check if variant is required but missing
    const product = products.find(p => p.id === item.productId);
    let variantsArray = product?.variants;
    if (typeof variantsArray === 'string') {
      try { variantsArray = JSON.parse(variantsArray); } catch { variantsArray = []; }
    }
    const hasVariants = variantsArray && Array.isArray(variantsArray) && variantsArray.length > 0;
    if (hasVariants && !item.variantName) {
      return false;
    }
    
    // Validate against correct stock (variant or main)
    const stock = getProductStock(item.productId, item.variantName);
    if (item.quantity > stock) return false;
    return true;
  });

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Mohon tambahkan setidaknya satu barang');
      return;
    }


    const invalidItems = items.filter(
      (item) => !item.productId || item.quantity <= 0 || item.price <= 0
    );
    if (invalidItems.length > 0) {
      toast.error('Mohon isi semua data barang dengan benar');
      return;
    }


    const outOfStockItems = items.filter((item) => {
      const stock = getProductStock(item.productId, item.variantName);
      return item.quantity > stock;
    });

    if (outOfStockItems.length > 0) {
      toast.error('Beberapa barang memiliki stok tidak mencukupi. Mohon periksa jumlah pesanan.');
      return;
    }


    updateMutation.mutate(
      {
        id,
        data: {
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          paymentMethod,
          saleDate: isUser ? getTodayDateInputValue() : saleDate,
          notes,
          items: items.map((item) => ({
            productId: item.productId || '',
            variantName: item.variantName || null,
            quantity: item.quantity,
            price: item.price.toString(),
            discount: '0',
          })),
        },
      },
      {
        onSuccess: () => router.push(`/sales/${id}`),
      }
    );
  };

  const isPending = updateMutation.isPending || loadingSale;

  if (loadingSale) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Penjualan tidak ditemukan</p>
        <Link href="/sales">
          <Button className="mt-4">Kembali ke Penjualan</Button>
        </Link>
      </div>
    );
  }

  if (sale.status !== 'PENDING') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hanya penjualan dengan status MENUNGGU yang dapat diedit</p>
        <Link href={`/sales/${id}`}>
          <Button className="mt-4">Lihat Penjualan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Penjualan', href: '/sales' },
          { label: sale.saleNumber, href: `/sales/${id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="flex items-center gap-4">
        <Link href={`/sales/${id}`} onClick={(e) => handleBack(e, `/sales/${id}`)}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>


        <div>
          <h1 className="text-3xl font-bold">Edit Penjualan</h1>
          <p className="text-gray-600 mt-1">{sale.saleNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nama Pelanggan</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isPending}
                  placeholder="Pelanggan Umum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telepon Pelanggan</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isPending}
                  placeholder="+62 xxx xxxx xxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode Pembayaran *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Tunai</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="CREDIT">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate">Tanggal Penjualan *</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={isUser ? getTodayDateInputValue() : saleDate}
                  onChange={(e) => {
                    if (!isUser) setSaleDate(e.target.value);
                  }}
                  disabled={isPending}
                  {...getUserTodayDateInputProps(isUser)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Barang</CardTitle>
            <Button type="button" onClick={addItem} disabled={isPending} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Barang
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-32">Varian</TableHead>
                  <TableHead className="w-24">Stok</TableHead>
                  <TableHead className="w-32">Jumlah</TableHead>
                  <TableHead className="w-40">Harga</TableHead>
                  <TableHead className="w-40 text-right">Subtotal</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Belum ada barang ditambahkan. Klik "Tambah Barang" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const stock = getProductStock(item.productId, item.variantName);
                    const isOutOfStock = item.quantity > stock;
                    const subtotal = item.quantity * item.price;

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItemFields(index, { productId: value, variantName: null })}
                            disabled={isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                    <SelectValue placeholder="Pilih" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variantsArray?.map((v: any, i: number) => {
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
                                      const isDisabled = isOutOfStock || isAlreadySelected;
                                      
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
                          <span className={stock <= 0 ? 'text-red-600 font-semibold' : ''}>
                            {stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={stock}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, 'quantity', parseInt(e.target.value) || 0)
                            }
                            disabled={isPending}
                            className={isOutOfStock ? 'border-red-500' : ''}
                          />
                          {isOutOfStock && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stok tidak cukup
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(index, 'price', parseFloat(e.target.value) || 0)
                            }
                            disabled={isPending}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rp {subtotal.toLocaleString('id-ID')}
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
                    );
                  })
                )}
              </TableBody>
            </Table>

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Jumlah</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending || !isFormValid}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </Button>
          <Link href={`/sales/${id}`} onClick={(e) => handleBack(e, `/sales/${id}`)}>
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
