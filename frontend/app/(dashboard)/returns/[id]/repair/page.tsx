'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRepairRestockReturn, useReturn } from '@/lib/hooks/useReturns';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2 } from 'lucide-react';

export default function ReturnRepairPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const returnQuery = useReturn(params.id);
  const repairReturn = useRepairRestockReturn();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canProcessRole = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DEV';
  const returnData = returnQuery.data?.data;
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [finalOutcomeNotes, setFinalOutcomeNotes] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [incomeLostAmount, setIncomeLostAmount] = useState('');
  const [qtyMap, setQtyMap] = useState<Record<string, { repaired: number; restocked: number }>>({});

  useEffect(() => {
    if (returnData && !canProcessRole) {
      router.replace(`/returns/${params.id}`);
    }
  }, [canProcessRole, params.id, returnData, router]);

  const items = returnData?.items || [];
  const payloadItems = useMemo(
    () =>
      items.map((item) => {
        const current = qtyMap[item.id];
        return {
          returnItemId: item.id,
          qtyRepaired: Number(current?.repaired ?? item.qtyRequested),
          qtyRestocked: Number(current?.restocked ?? current?.repaired ?? item.qtyRequested),
        };
      }),
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
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Revisi' }]} />
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
          { label: 'Revisi' },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold">Retur Revisi lalu Masuk Stok</h1>
        <p className="mt-1 text-muted-foreground">
          Barang direvisi/perbaiki, lalu stok bertambah. Pendapatan penjualan awal tetap dicatat tidak masuk.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Item Revisi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => {
            const current = qtyMap[item.id] || { repaired: item.qtyRequested, restocked: item.qtyRequested };
            return (
              <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_180px_180px] md:items-center">
                <div>
                  <p className="font-medium">{item.product?.name || item.productId}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty retur: {item.qtyRequested}{item.variantName ? ` • Varian: ${item.variantName}` : ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Qty direvisi</Label>
                  <Input
                    type="number"
                    min={1}
                    max={item.qtyRequested}
                    value={current.repaired}
                    onChange={(event) =>
                      setQtyMap((prev) => ({
                        ...prev,
                        [item.id]: { ...current, repaired: Number(event.target.value || 0) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Qty masuk stok</Label>
                  <Input
                    type="number"
                    min={1}
                    max={current.repaired}
                    value={current.restocked}
                    onChange={(event) =>
                      setQtyMap((prev) => ({
                        ...prev,
                        [item.id]: { ...current, restocked: Number(event.target.value || 0) },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Biaya Revisi</Label>
              <Input type="number" min={0} value={repairCost} onChange={(event) => setRepairCost(event.target.value)} />
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
            <Label>Catatan Revisi</Label>
            <Textarea rows={3} value={repairNotes} onChange={(event) => setRepairNotes(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catatan Akhir</Label>
            <Textarea rows={3} value={finalOutcomeNotes} onChange={(event) => setFinalOutcomeNotes(event.target.value)} />
          </div>

          <Button
            disabled={
              !canProcess ||
              repairReturn.isPending ||
              payloadItems.some((item) => item.qtyRepaired <= 0 || item.qtyRestocked <= 0 || item.qtyRestocked > item.qtyRepaired)
            }
            onClick={() =>
              repairReturn.mutate(
                {
                  id: params.id,
                  data: {
                    inspectionNotes,
                    repairNotes,
                    finalOutcomeNotes,
                    repairCost: repairCost ? Number(repairCost) : undefined,
                    incomeLostAmount: incomeLostAmount ? Number(incomeLostAmount) : undefined,
                    items: payloadItems,
                  },
                },
                { onSuccess: () => router.push(`/returns/${params.id}`) }
              )
            }
          >
            Konfirmasi Revisi dan Masuk Stok
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
