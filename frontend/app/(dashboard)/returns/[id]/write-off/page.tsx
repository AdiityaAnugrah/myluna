'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReturn, useWriteOffReturn } from '@/lib/hooks/useReturns';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2 } from 'lucide-react';

export default function ReturnWriteOffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const returnQuery = useReturn(params.id);
  const writeOffReturn = useWriteOffReturn();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canProcessRole = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DEV';
  const returnData = returnQuery.data?.data;
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [finalOutcomeNotes, setFinalOutcomeNotes] = useState('');
  const [lossAmount, setLossAmount] = useState('');
  const [incomeLostAmount, setIncomeLostAmount] = useState('');
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
        qtyWrittenOff: Number(qtyMap[item.id] ?? item.qtyRequested),
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
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Hangus' }]} />
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
          { label: 'Hangus' },
        ]}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retur Hangus</h1>
          <p className="mt-1 text-muted-foreground">Barang tidak masuk stok dan dicatat sebagai kerugian.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/returns/${params.id}/repair`)}>
          Pilih Revisi
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Item Hangus</CardTitle></CardHeader>
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
                <Label>Qty hangus</Label>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nilai Kerugian</Label>
              <Input type="number" min={0} value={lossAmount} onChange={(event) => setLossAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pendapatan Tidak Masuk</Label>
              <Input type="number" min={0} value={incomeLostAmount} onChange={(event) => setIncomeLostAmount(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Catatan Inspeksi</Label>
            <Textarea rows={3} value={inspectionNotes} onChange={(event) => setInspectionNotes(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catatan Akhir</Label>
            <Textarea rows={3} value={finalOutcomeNotes} onChange={(event) => setFinalOutcomeNotes(event.target.value)} />
          </div>

          <Button
            variant="destructive"
            disabled={!canProcess || writeOffReturn.isPending || payloadItems.some((item) => item.qtyWrittenOff <= 0)}
            onClick={() =>
              writeOffReturn.mutate(
                {
                  id: params.id,
                  data: {
                    inspectionNotes,
                    finalOutcomeNotes,
                    lossAmount: lossAmount ? Number(lossAmount) : undefined,
                    incomeLostAmount: incomeLostAmount ? Number(incomeLostAmount) : undefined,
                    items: payloadItems,
                  },
                },
                { onSuccess: () => router.push(`/returns/${params.id}`) }
              )
            }
          >
            Konfirmasi Hangus
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
