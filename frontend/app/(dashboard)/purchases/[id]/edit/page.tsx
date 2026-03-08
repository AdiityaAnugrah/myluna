'use client';

import { useState, useEffect, use, useMemo } from 'react';


import { useRouter } from 'next/navigation';
import { usePurchase, useUpdatePurchase } from '@/lib/hooks/usePurchases';
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
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';








interface PurchaseItem {
  productId: string;
  quantity: number;
  price: number;
}

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: purchaseData, isLoading: loadingPurchase } = usePurchase(id);
  const updateMutation = useUpdatePurchase();
  const { data: suppliersData } = useSuppliers();
  const { data: productsData } = useProducts({ limit: 100 });

  const suppliers = suppliersData?.data?.suppliers || [];
  const products = productsData?.data?.products || [];
  const purchase = purchaseData?.data;

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!purchase || !initialDataLoaded) return false;
    
    return (
      supplierId !== purchase.supplierId ||
      notes !== (purchase.notes || '') ||
      purchaseDate !== purchase.purchaseDate.split('T')[0] ||
      items.length !== (purchase.items?.length || 0)
    );
  }, [supplierId, notes, purchaseDate, items, purchase, initialDataLoaded]);

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

    if (purchase) {
      setSupplierId(purchase.supplierId);
      setPurchaseDate(purchase.purchaseDate.split('T')[0]);
      setNotes(purchase.notes || '');
      setItems(
        purchase.items?.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })) || []
      );
      setInitialDataLoaded(true);
    }
  }, [purchase]);


  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

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


    const invalidItems = items.filter((item) => !item.productId || item.quantity <= 0 || item.price < 0);
    if (invalidItems.length > 0) {
      toast.error('Mohon isi semua data barang dengan benar');
      return;
    }


    updateMutation.mutate(
      {
        id,
        data: {
          supplierId,
          purchaseDate,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.toString(),
          })),
        },
      },
      {
        onSuccess: () => router.push(`/purchases/${id}`),
      }
    );
  };

  const isPending = updateMutation.isPending || loadingPurchase;

  if (loadingPurchase) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pembelian tidak ditemukan</p>
        <Link href="/purchases">
          <Button className="mt-4">Kembali ke Pembelian</Button>
        </Link>
      </div>
    );
  }

  if (purchase.status !== 'PENDING') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hanya pembelian dengan status MENUNGGU yang dapat diedit</p>
        <Link href={`/purchases/${id}`}>
          <Button className="mt-4">Lihat Pembelian</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Pembelian', href: '/purchases' },
          { label: purchase.purchaseNumber, href: `/purchases/${id}` },
          { label: 'Edit' },
        ]}
      />
      <div className="flex items-center gap-4">
        <Link href={`/purchases/${id}`} onClick={(e) => handleBack(e, `/purchases/${id}`)}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>


        <div>
          <h1 className="text-3xl font-bold">Edit Pesanan Pembelian</h1>
          <p className="text-gray-600 mt-1">{purchase.purchaseNumber}</p>
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
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={isPending}
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
                  <TableHead className="w-32">Jumlah</TableHead>
                  <TableHead className="w-40">Harga</TableHead>
                  <TableHead className="w-40 text-right">Subtotal</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Belum ada barang ditambahkan. Klik "Tambah Barang" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => updateItem(index, 'productId', value)}
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
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        Rp {(item.quantity * item.price).toLocaleString('id-ID')}
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

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Jumlah</p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </Button>
          <Link href={`/purchases/${id}`} onClick={(e) => handleBack(e, `/purchases/${id}`)}>
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
