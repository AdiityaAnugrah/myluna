'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Calendar,
  User,
  Hash,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Info,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StockMovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: any;
}

export function StockMovementDetailModal({ isOpen, onClose, movement }: StockMovementDetailModalProps) {
  if (!movement) return null;

  const getMovementTypeDetails = (type: string, quantity: number) => {
    switch (type) {
      case 'IN':
        return {
          label: 'Stok Masuk',
          variant: 'success' as const,
          icon: <ArrowUpRight className="h-4 w-4" />,
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-600'
        };
      case 'OUT':
        return {
          label: 'Stok Keluar',
          variant: 'destructive' as const,
          icon: <ArrowDownLeft className="h-4 w-4" />,
          bgColor: 'bg-red-500/10',
          textColor: 'text-red-600'
        };
      case 'ADJUSTMENT':
        return {
          label: `Penyesuaian ${quantity > 0 ? '(+)' : '(-)'}`,
          variant: 'default' as const,
          icon: <Settings className="h-4 w-4" />,
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-600'
        };
      default:
        return {
          label: type,
          variant: 'outline' as const,
          icon: <Info className="h-4 w-4" />,
          bgColor: 'bg-blue-500/10',
          textColor: 'text-blue-600'
        };
    }
  };

  const typeDetails = getMovementTypeDetails(movement.type, movement.quantity);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="h-5 w-5 text-orange-500" />
            Detail Pergerakan Stok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Main Status Header */}
          <div className={cn("flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed", typeDetails.bgColor, "border-" + typeDetails.textColor.split('-')[1] + "-200")}>
            <div className={cn("p-3 rounded-full mb-3", typeDetails.bgColor)}>
              {typeDetails.icon}
            </div>
            <p className={cn("text-3xl font-black mb-1", typeDetails.textColor)}>
              {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}{Math.abs(movement.quantity)}
            </p>
            <Badge variant={typeDetails.variant} className="px-3 py-1 font-bold">
              {typeDetails.label}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Produk</p>
                  <p className="font-bold text-sm">{movement.product?.name || '-'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">SKU: {movement.product?.sku || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Waktu & Tanggal</p>
                  <p className="font-semibold text-sm">{format(new Date(movement.createdAt), 'dd MMMM yyyy, HH:mm')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No. Referensi</p>
                  <p className="font-mono text-sm">{movement.reference || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Penanggung Jawab</p>
                  <p className="font-semibold text-sm">{movement.creator?.fullName || movement.creator?.email || 'System'}</p>
                </div>
              </div>
            </div>

            {/* Stok Sebelum & Sesudah */}
            {(() => {
              const hasAfter = movement.stockAfter !== null && movement.stockAfter !== undefined;
              const hasBefore = movement.stockBefore !== null && movement.stockBefore !== undefined;
              const derivedBefore = hasBefore ? movement.stockBefore : (hasAfter ? movement.stockAfter - movement.quantity : null);
              const derivedAfter = hasAfter ? movement.stockAfter : (hasBefore ? movement.stockBefore + movement.quantity : null);
              const isEstimated = !hasBefore || !hasAfter;

              if (derivedBefore === null && derivedAfter === null) return null;

              return (
                <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Perubahan Stok</p>
                    {isEstimated && (
                      <span className="text-[10px] text-muted-foreground italic">*estimasi</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {/* Sebelum */}
                    <div className="flex-1 text-center bg-background border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Sebelum</p>
                      <p className="text-2xl font-black text-foreground">{derivedBefore ?? '-'}</p>
                    </div>

                    {/* Arrow */}
                    <div className={cn("flex flex-col items-center gap-0.5", typeDetails.textColor)}>
                      {movement.type === 'IN' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : movement.type === 'OUT' ? (
                        <TrendingDown className="h-5 w-5" />
                      ) : (
                        <Minus className="h-5 w-5" />
                      )}
                      <span className="text-xs font-bold">
                        {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : (movement.quantity > 0 ? '+' : '')}
                        {Math.abs(movement.quantity)}
                      </span>
                    </div>

                    {/* Sesudah */}
                    <div className={cn("flex-1 text-center border rounded-lg p-3", typeDetails.bgColor)}>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", typeDetails.textColor)}>Sesudah</p>
                      <p className={cn("text-2xl font-black", typeDetails.textColor)}>
                        {derivedAfter ?? '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Alasan / Catatan</p>
                  <p className="text-sm mt-1 leading-relaxed text-foreground">
                    {movement.notes || 'Tidak ada catatan tambahan untuk pergerakan ini.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
