'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { stockAdjustmentSchema, StockAdjustmentFormData } from '@/lib/validations/schemas';
import { useCreateStockAdjustment } from '@/lib/hooks/useStock';
import { useProducts } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';
import { ProductSelector } from '@/components/sales/ProductSelector';


export default function StockAdjustmentPage() {
  const router = useRouter();
  const { data: productsData } = useProducts();
  const products = productsData?.data?.products || [];
  const createMutation = useCreateStockAdjustment();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
  });

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


  const productId = watch('productId');
  const type = watch('type');

  const onSubmit = (data: StockAdjustmentFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => router.push('/stock'),
    });
  };

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/stock" onClick={(e) => handleBack(e, '/stock')}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <div className="animate-in">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Penyesuaian Stok</h1>
          <p className="text-muted-foreground mt-1">Sesuaikan level stok produk secara manual</p>
        </div>
      </div>

      <Card className="animate-in [animation-delay:100ms] border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">Informasi Penyesuaian</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="productId">Produk *</Label>
                <ProductSelector
                  selectedProductId={productId}
                  onSelect={(value) => setValue('productId', value)}
                  disabled={isPending}
                  allowOutOfStock={true}
                />
                <p className="text-xs text-muted-foreground">
                  Cari berdasarkan nama atau SKU produk.
                </p>
                {errors.productId && (
                  <p className="text-sm text-red-500">{errors.productId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipe *</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setValue('type', value as 'IN' | 'OUT')}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Stok Masuk (+)</SelectItem>
                    <SelectItem value="OUT">Stok Keluar (-)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   <span className="text-green-500 font-bold">• Stok Masuk (+):</span> Menambah jumlah stok (cth: Pembelian, Retur).<br/>
                   <span className="text-red-500 font-bold">• Stok Keluar (-):</span> Mengurangi jumlah stok (cth: Rusak, Hilang).
                </p>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah *</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  disabled={isPending}
                  placeholder="0"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                disabled={isPending}
                placeholder="Alasan penyesuaian"
                rows={4}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isPending} className="px-8">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Buat Penyesuaian'
                )}
              </Button>
              <Link href="/stock" onClick={(e) => handleBack(e, '/stock')}>
                <Button type="button" variant="ghost" disabled={isPending}>
                  Batal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

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
