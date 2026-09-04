'use client';

import { useEffect, useMemo, useState } from 'react';
import { Product } from '@/types';
import { useRequestProductPriceChange } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PriceChangeRequestDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
};

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(toNumber(value));

export function PriceChangeRequestDialog({ product, open, onOpenChange }: PriceChangeRequestDialogProps) {
  const mutation = useRequestProductPriceChange();
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [warrantyPrice, setWarrantyPrice] = useState('');
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setPurchasePrice(String(toNumber(product.purchasePrice)));
      setSellingPrice(String(toNumber(product.sellingPrice)));
      setWarrantyPrice(product.warrantyPrice ? String(toNumber(product.warrantyPrice)) : '');
      setReason('');
      setAttempted(false);
    }
  }, [open, product]);

  const changes = useMemo(() => {
    const nextPurchase = toNumber(purchasePrice);
    const nextSelling = toNumber(sellingPrice);
    const nextWarranty = warrantyPrice === '' ? null : toNumber(warrantyPrice);
    return {
      purchase: nextPurchase !== toNumber(product.purchasePrice),
      selling: nextSelling !== toNumber(product.sellingPrice),
      warranty: nextWarranty !== (product.warrantyPrice ? toNumber(product.warrantyPrice) : null),
    };
  }, [purchasePrice, sellingPrice, warrantyPrice, product]);

  const hasChange = changes.purchase || changes.selling || changes.warranty;
  const invalidPrice =
    purchasePrice === '' ||
    sellingPrice === '' ||
    Number(purchasePrice) < 0 ||
    Number(sellingPrice) < 0 ||
    (warrantyPrice !== '' && Number(warrantyPrice) < 0);

  const submit = () => {
    setAttempted(true);
    if (!hasChange || invalidPrice) return;

    mutation.mutate(
      {
        id: product.id,
        data: {
          purchasePrice: Number(purchasePrice),
          sellingPrice: Number(sellingPrice),
          warrantyPrice: warrantyPrice === '' ? null : Number(warrantyPrice),
          reason: reason.trim(),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajukan Perubahan Harga</DialogTitle>
          <DialogDescription>
            Pengajuan untuk <strong>{product.name}</strong> akan masuk ke halaman Persetujuan Admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Harga lama: Beli {formatCurrency(product.purchasePrice)} · Jual {formatCurrency(product.sellingPrice)}
            {product.warrantyPrice ? ` · Garansi ${formatCurrency(product.warrantyPrice)}` : ''}
          </div>

          {attempted && !hasChange && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              Ubah minimal satu nilai harga sebelum mengirim pengajuan.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Harga Beli</Label>
              <Input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Harga Jual</Label>
              <Input type="number" min={0} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Harga Pakai Garansi</Label>
            <Input
              type="number"
              min={0}
              placeholder="Kosongkan jika tidak ada garansi"
              value={warrantyPrice}
              onChange={(e) => setWarrantyPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Alasan / Catatan</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Harga supplier naik, promo selesai, penyesuaian marketplace..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
