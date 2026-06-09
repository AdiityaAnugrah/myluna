'use client';

import { useState } from 'react';
import { useCreateSettlement } from '@/lib/hooks/useSettlements';
import { useAuthStore } from '@/lib/stores/auth';
import { notify } from '@/lib/notify';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettlementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: any;
  onSuccess?: () => void;
}

export function SettlementFormDialog({
  open,
  onOpenChange,
  sale,
  onSuccess,
}: SettlementFormDialogProps) {
  const [netAmount, setNetAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState(getTodayDateInputValue());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const createMutation = useCreateSettlement();
  const { user } = useAuthStore();
  const isUser = user?.role === 'USER';
  const today = getTodayDateInputValue();

  // Format currency for display
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Parse Rupiah input to number
  const parseRupiah = (value: string): string => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    return numbers;
  };

  // Handle Rupiah input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseRupiah(value);
    setNetAmount(parsed);
  };

  // Format for display in input
  const displayAmount = netAmount
    ? formatCurrency(netAmount)
    : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!netAmount || parseFloat(netAmount) <= 0) {
      notify.error('Dana bersih belum valid', {
        description: 'Masukkan nominal dana bersih yang lebih besar dari 0.',
      });
      return;
    }

    if (!settlementDate) {
      notify.error('Tanggal pelunasan wajib diisi', {
        description: 'Pilih tanggal saat dana pelunasan diterima.',
      });
      return;
    }

    const totalAmountNum = parseFloat(sale.totalAmount || '0');
    if (parseFloat(netAmount) > totalAmountNum) {
      notify.warning('Dana bersih melebihi total penjualan', {
        description: 'Periksa kembali nominal yang diterima sebelum menyimpan pelunasan.',
      });
      return;
    }

    // Show confirmation dialog
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    const formData = new FormData();
    formData.append('saleId', sale.id);
    formData.append('invoiceNumber', sale.saleNumber || '');
    formData.append('netAmount', netAmount);
    formData.append('settlementDate', isUser ? today : settlementDate);

    createMutation.mutate(formData, {
      onSuccess: () => {
        // Reset form
        setNetAmount('');
        setSettlementDate(getTodayDateInputValue());
        setConfirmOpen(false);
        
        if (onSuccess) {
          onSuccess();
        }
      },
    });
  };

  if (!sale) return null;

  const totalAmount = parseFloat(sale.totalAmount || '0');
  const netAmountNum = parseFloat(netAmount || '0');
  const difference = totalAmount - netAmountNum;

  const isFormValid = netAmountNum > 0 && 
                      !!settlementDate && 
                      netAmountNum <= totalAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Input Pelunasan</DialogTitle>
            <DialogDescription>
              Masukkan dana bersih yang diterima untuk penjualan ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sale Info */}
            <div className="bg-muted/40 border border-border p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">No Invoice:</span>
                <span className="font-semibold">{sale.saleNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pelanggan:</span>
                <span className="font-medium">{sale.customerName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Penjualan (Kotor):</span>
                <span className="font-bold text-primary">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            </div>



            {/* Net Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="netAmount">
                Dana Bersih <span className="text-red-500">*</span>
              </Label>
              <Input
                id="netAmount"
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="Rp 0"
                required
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan jumlah dana bersih yang benar-benar diterima
              </p>
            </div>

            {/* Difference Display */}
            {netAmountNum > 0 && (
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Selisih:</span>
                  <span className={`font-bold ${difference >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(difference))}
                    {difference < 0 && ' (Dana bersih lebih besar!)'}
                  </span>
                </div>
              </div>
            )}

            {/* Settlement Date */}
            <div className="space-y-2">
              <Label htmlFor="settlementDate">
                Tanggal Pelunasan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="settlementDate"
                type="date"
                value={isUser ? today : settlementDate}
                onChange={(e) => {
                  if (!isUser) setSettlementDate(e.target.value);
                }}
                {...getUserTodayDateInputProps(isUser)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !isFormValid}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Pelunasan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
              <AlertDialogTitle className="text-xl">Konfirmasi Data Pelunasan</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild className="pt-4 space-y-3">
              <div>
                <p className="text-base font-medium text-foreground">
                  Apakah Anda yakin dengan data yang Anda masukkan?
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-950/25 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Perhatian:</strong> Setelah data disimpan, Anda tidak dapat mengedit atau menghapus data pelunasan ini lagi.</span>
                  </p>
                </div>
                <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No Invoice:</span>
                    <span className="font-semibold">{sale.saleNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dana Bersih:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal:</span>
                    <span className="font-semibold">{new Date(settlementDate).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMutation.isPending}>Periksa Kembali</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSubmit}
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Ya, Simpan Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
