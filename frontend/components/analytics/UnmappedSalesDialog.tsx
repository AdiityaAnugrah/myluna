'use client';

import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AlertTriangle, MapPin, RefreshCw } from 'lucide-react';
import { SalesAnalyticsParams } from '@/lib/api/analytics';
import { useUnmappedSalesDiagnostics } from '@/lib/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UnmappedSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: SalesAnalyticsParams;
  targetLabel: string;
}

export function UnmappedSalesDialog({
  open,
  onOpenChange,
  params,
  targetLabel,
}: UnmappedSalesDialogProps) {
  const diagnosticsQuery = useUnmappedSalesDiagnostics(params, open);
  const diagnostics = diagnosticsQuery.data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle>Penjualan Belum Terpetakan</DialogTitle>
          <DialogDescription>
            Pemeriksaan alamat yang belum memiliki data {targetLabel.toLowerCase()}.
            {diagnostics && ` Menampilkan ${diagnostics.shown} dari ${diagnostics.total} penjualan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-2">
          {diagnosticsQuery.isLoading ? (
            <div className="space-y-4 py-4" aria-label="Memuat diagnosis alamat">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 border-b pb-4 last:border-0">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : diagnosticsQuery.isError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
              <p className="text-sm text-muted-foreground">Diagnosis alamat gagal dimuat.</p>
              <Button variant="outline" onClick={() => diagnosticsQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Button>
            </div>
          ) : diagnostics?.items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
              <MapPin className="h-7 w-7 text-success" />
              <p className="font-medium">Semua penjualan sudah terpetakan</p>
            </div>
          ) : (
            <div>
              {diagnostics?.items.map((item) => (
                <section key={item.id} className="space-y-3 border-b py-5 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.saleNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.saleDate), 'dd MMMM yyyy', { locale: idLocale })}
                        {item.customerName && ` · ${item.customerName}`}
                      </p>
                    </div>
                    <Badge variant={item.postalCode ? 'outline' : 'destructive'}>
                      {item.postalCode || 'Tanpa kode pos'}
                    </Badge>
                  </div>

                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm leading-6">
                    {item.shippingAddress || 'Alamat pengiriman tidak tersedia'}
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>{item.reason}</span>
                  </div>

                  {item.candidates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.candidates.map((candidate) => (
                        <Badge
                          key={candidate}
                          variant="secondary"
                          className="h-auto whitespace-normal py-1 text-left leading-5"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          {candidate}
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
