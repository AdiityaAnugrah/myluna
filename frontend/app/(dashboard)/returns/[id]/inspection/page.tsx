'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInspectReturn, useReturn } from '@/lib/hooks/useReturns';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2 } from 'lucide-react';

export default function ReturnInspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const returnQuery = useReturn(params.id);
  const inspectReturn = useInspectReturn();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canProcess = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const returnData = returnQuery.data?.data;

  const [inspectionNotes, setInspectionNotes] = useState('');

  useEffect(() => {
    if (returnData && !canProcess) {
      router.replace(`/returns/${params.id}`);
    }
  }, [canProcess, params.id, returnData, router]);

  const submitInspection = (inspectionResult: 'GOOD' | 'NOT_GOOD') => {
    inspectReturn.mutate(
      {
        id: params.id,
        data: { inspectionResult, inspectionNotes: inspectionNotes.trim() || undefined },
      },
      {
        onSuccess: () => {
          router.push(
            inspectionResult === 'GOOD'
              ? `/returns/${params.id}/restock`
              : `/returns/${params.id}/write-off`
          );
        },
      }
    );
  };

  if (returnQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memuat data retur...
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Inspeksi' }]} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Data retur tidak ditemukan.
          </CardContent>
        </Card>
      </div>
    );
  }

  const canInspect = returnData.status === 'ITEM_RECEIVED';
  if (!canProcess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Retur', href: '/returns' },
          { label: returnData.returnNumber, href: `/returns/${params.id}` },
          { label: 'Inspeksi' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Inspeksi Retur</h1>
        <p className="mt-1 text-muted-foreground">
          Tentukan kondisi barang retur sebelum masuk ke keputusan akhir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Retur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Nomor Retur: <strong>{returnData.returnNumber}</strong></p>
          <p>Pesanan: {returnData.sale?.saleNumber || '-'}</p>
          <p>Customer: {returnData.sale?.customerName || '-'}</p>
          <p>Status: {returnData.status}</p>
          {!canInspect && (
            <p className="text-destructive">
              Inspeksi hanya bisa dilakukan saat status barang sudah diterima.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hasil Inspeksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Catatan Inspeksi</Label>
            <Textarea
              rows={4}
              value={inspectionNotes}
              onChange={(event) => setInspectionNotes(event.target.value)}
              placeholder="Contoh: barang masih bagus, dus penyok, bagian tertentu rusak, dll."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              disabled={!canInspect || inspectReturn.isPending}
              onClick={() => submitInspection('GOOD')}
            >
              Barang Layak Pakai
            </Button>
            <Button
              variant="destructive"
              disabled={!canInspect || inspectReturn.isPending}
              onClick={() => submitInspection('NOT_GOOD')}
            >
              Barang Tidak Layak
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Barang layak akan lanjut ke halaman masuk stok. Barang tidak layak akan lanjut ke keputusan hangus atau revisi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
