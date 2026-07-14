'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRestockReturn, useReturn } from '@/lib/hooks/useReturns';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2 } from 'lucide-react';

export default function ReturnRestockPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const returnQuery = useReturn(params.id);
  const restockReturn = useRestockReturn();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canProcessRole = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DEV';
  const returnData = returnQuery.data?.data;
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (returnData && !canProcessRole) {
      router.replace(`/returns/${params.id}`);
    }
  }, [canProcessRole, params.id, returnData, router]);

  const items = returnData?.items || [];
  const payloadItems = useMemo(
    () =>
      items.map((item) => ({
        returnItemId: item.id,
        qtyReceived: Number(qtyMap[item.id] ?? item.qtyRequested),
      })),
    [items, qtyMap]
  );

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
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Masuk Stok' }]} />
        <Card><CardContent className="py-10 text-center text-muted-foreground">Data retur tidak ditemukan.</CardContent></Card>
      </div>
    );
  }

  const canProcess = returnData.status === 'ITEM_RECEIVED';
  if (!canProcessRole) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Retur', href: '/returns' },
          { label: returnData.returnNumber, href: `/returns/${params.id}` },
          { label: 'Masuk Stok' },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold">Retur Masuk Stok</h1>
        <p className="mt-1 text-muted-foreground">Gunakan untuk barang retur yang masih layak pakai.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Item yang Masuk Stok</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px] md:items-center">
              <div>
                <p className="font-medium">{item.product?.name || item.productId}</p>
                <p className="text-sm text-muted-foreground">
                  Qty retur: {item.qtyRequested}{item.variantName ? ` • Varian: ${item.variantName}` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <Label>Qty masuk stok</Label>
                <Input
                  type="number"
                  min={1}
                  max={item.qtyRequested}
                  value={qtyMap[item.id] ?? item.qtyRequested}
                  onChange={(event) =>
                    setQtyMap((prev) => ({ ...prev, [item.id]: Number(event.target.value || 0) }))
                  }
                />
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea rows={3} value={inspectionNotes} onChange={(event) => setInspectionNotes(event.target.value)} />
          </div>

          <Button
            disabled={!canProcess || restockReturn.isPending || payloadItems.some((item) => item.qtyReceived <= 0)}
            onClick={() =>
              restockReturn.mutate(
                { id: params.id, data: { inspectionNotes, items: payloadItems } },
                { onSuccess: () => router.push(`/returns/${params.id}`) }
              )
            }
          >
            Konfirmasi Masuk Stok
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
