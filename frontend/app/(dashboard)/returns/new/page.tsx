'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useCreateReturn, useEligibleReturnSales } from '@/lib/hooks/useReturns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { Loader2, Search } from 'lucide-react';
import { Sale } from '@/types';

export default function NewReturnPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canCreate = role === 'USER' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DEV';

  const [saleQuery, setSaleQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [itemQtyMap, setItemQtyMap] = useState<Record<string, number>>({});

  const createReturn = useCreateReturn();
  const eligibleSalesQuery = useEligibleReturnSales(debouncedQuery, {
    enabled: canCreate,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(saleQuery), 300);
    return () => clearTimeout(timer);
  }, [saleQuery]);

  const eligibleSales = useMemo(() => eligibleSalesQuery.data?.data || [], [eligibleSalesQuery.data]);
  const selectedItems = useMemo(
    () =>
      (selectedSale?.items || [])
        .map((item) => ({
          saleItemId: item.id,
          qtyRequested: Number(itemQtyMap[item.id] || 0),
        }))
        .filter((item) => item.qtyRequested > 0),
    [itemQtyMap, selectedSale]
  );

  const canSubmit =
    !!selectedSale &&
    reason.trim().length >= 5 &&
    photos.length > 0 &&
    selectedItems.length > 0 &&
    !createReturn.isPending;

  const handleSubmit = () => {
    if (!selectedSale) return;
    if (photos.length > 5) {
      notify.warning('Maksimal 5 foto bukti retur');
      return;
    }

    const formData = new FormData();
    formData.append('saleId', selectedSale.id);
    formData.append('reason', reason.trim());
    formData.append('items', JSON.stringify(selectedItems));
    photos.forEach((photo) => formData.append('evidencePhotos', photo));

    createReturn.mutate(formData, {
      onSuccess: (response) => {
        router.push(`/returns/${response.data.id}`);
      },
    });
  };

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Buat Retur' }]} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Anda tidak memiliki akses untuk membuat retur.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Buat Retur' }]} />

      <div>
        <h1 className="text-3xl font-bold">Buat Retur Baru</h1>
        <p className="mt-1 text-muted-foreground">
          Pilih penjualan yang sudah diproses, selesai, atau pelunasan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Retur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Cari Penjualan</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cari nomor penjualan atau nama customer"
                value={saleQuery}
                onChange={(event) => setSaleQuery(event.target.value)}
              />
            </div>
            {debouncedQuery.trim().length >= 2 && (
              <div className="max-h-56 overflow-y-auto rounded-md border">
                {eligibleSalesQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mencari penjualan...
                  </div>
                ) : eligibleSales.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Penjualan eligible tidak ditemukan.</div>
                ) : (
                  eligibleSales.map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      className={`w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/40 ${
                        selectedSale?.id === sale.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => {
                        setSelectedSale(sale);
                        setItemQtyMap({});
                      }}
                    >
                      <div className="font-medium text-sm">{sale.saleNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {sale.customerName || '-'} • {new Date(sale.saleDate).toLocaleDateString('id-ID')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedSale && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Penjualan Terpilih</p>
                <p className="text-sm">No Penjualan: <strong>{selectedSale.saleNumber}</strong></p>
                <p className="text-sm">Customer: <strong>{selectedSale.customerName || '-'}</strong></p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Pilih Item yang Diretur</p>
                {(selectedSale.items || []).map((item) => (
                  <div key={item.id} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px] md:items-center">
                    <div>
                      <p className="font-medium">{item.product?.name || item.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty terjual: {item.quantity}
                        {item.variantName ? ` • Varian: ${item.variantName}` : ''}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label>Qty Retur</Label>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={itemQtyMap[item.id] || ''}
                        onChange={(event) => {
                          const next = Number(event.target.value || 0);
                          setItemQtyMap((prev) => ({
                            ...prev,
                            [item.id]: Number.isNaN(next) ? 0 : Math.min(Math.max(next, 0), item.quantity),
                          }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Alasan Retur</Label>
            <Textarea
              rows={4}
              placeholder="Jelaskan alasan retur dengan jelas"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto Bukti Retur (1-5 foto)</Label>
            <Input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(event) => setPhotos(Array.from(event.target.files || []))}
            />
            {photos.length > 0 && (
              <div className="space-y-1">
                {photos.map((photo) => (
                  <p key={`${photo.name}-${photo.size}`} className="text-xs text-muted-foreground">
                    {photo.name} ({Math.round(photo.size / 1024)} KB)
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {createReturn.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengajukan Retur...
                </>
              ) : (
                'Ajukan Retur'
              )}
            </Button>
            <Button variant="outline" onClick={() => router.push('/returns')}>
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
