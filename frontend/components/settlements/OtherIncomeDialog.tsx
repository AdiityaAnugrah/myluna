'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
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
import { Loader2, Upload, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';

const BANK_OPTIONS = [
  { value: 'BCA', label: 'BCA' },
  { value: 'BRI', label: 'BRI' },
  { value: 'BNI', label: 'BNI' },
  { value: 'Mandiri', label: 'Mandiri' },
  { value: 'Gopay', label: 'Gopay' },
  { value: 'OVO', label: 'OVO' },
  { value: 'Dana', label: 'Dana' },
  { value: 'Shopee Pay', label: 'Shopee Pay' },
  { value: 'LAINNYA', label: 'Bank/Metode Lainnya...' },
];

interface OtherIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function useCreateOtherIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post('/other-incomes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
      toast.success('Pendapatan lain-lain berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data');
    },
  });
}

export function OtherIncomeDialog({ open, onOpenChange, onSuccess }: OtherIncomeDialogProps) {
  const { user } = useAuthStore();
  const isUser = user?.role === 'USER';
  const today = getTodayDateInputValue();

  const [transactionDate, setTransactionDate] = useState(today);
  const [bankOption, setBankOption] = useState('');
  const [customBank, setCustomBank] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [amount, setAmount] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const createMutation = useCreateOtherIncome();

  const formatCurrency = (value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const parseAmount = (value: string): string => value.replace(/\D/g, '');

  const effectiveBank = bankOption === 'LAINNYA' ? customBank : bankOption;
  const amountNum = parseInt(amount || '0', 10);

  const isFormValid =
    transactionDate &&
    effectiveBank.trim() !== '' &&
    buyerName.trim() !== '' &&
    amountNum > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Hanya file JPG, PNG, atau PDF yang diizinkan');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 3 MB');
      return;
    }
    setProofFile(file);
  };

  const resetForm = () => {
    setTransactionDate(today);
    setBankOption('');
    setCustomBank('');
    setBuyerName('');
    setAmount('');
    setKeterangan('');
    setProofFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const formData = new FormData();
    formData.append('transactionDate', isUser ? today : transactionDate);
    formData.append('bankName', effectiveBank.trim());
    formData.append('buyerName', buyerName.trim());
    formData.append('amount', amount);
    if (keterangan.trim()) formData.append('notes', keterangan.trim());
    if (proofFile) formData.append('proofDocument', proofFile);

    createMutation.mutate(formData, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!createMutation.isPending) { resetForm(); onOpenChange(v); } }}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Pendapatan Lain-lain</DialogTitle>
            <DialogDescription>
              Input pendapatan diluar penjualan reguler
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tanggal */}
            <div className="space-y-2">
              <Label htmlFor="transactionDate">
                Tanggal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transactionDate"
                type="date"
                value={isUser ? today : transactionDate}
                onChange={(e) => {
                  if (!isUser) setTransactionDate(e.target.value);
                }}
                {...getUserTodayDateInputProps(isUser)}
                required
              />
            </div>

            {/* Bank */}
            <div className="space-y-2">
              <Label>
                Bank / Metode Pembayaran <span className="text-red-500">*</span>
              </Label>
              <Select value={bankOption} onValueChange={setBankOption}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bank..." />
                </SelectTrigger>
                <SelectContent>
                  {BANK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bankOption === 'LAINNYA' && (
                <Input
                  placeholder="Nama bank atau metode lainnya"
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  required
                />
              )}
            </div>

            {/* Nama Pembeli */}
            <div className="space-y-2">
              <Label htmlFor="buyerName">
                Nama Pembeli <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nama pembeli / pengirim uang"
                required
              />
            </div>

            {/* Jumlah Transaksi */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Jumlah Transaksi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                value={amount ? formatCurrency(amount) : ''}
                onChange={(e) => setAmount(parseAmount(e.target.value))}
                placeholder="Rp 0"
                className="text-lg font-semibold"
                required
              />
            </div>

            {/* Keterangan / Keperluan */}
            <div className="space-y-2">
              <Label htmlFor="keterangan">
                Keterangan / Keperluan <span className="text-xs text-muted-foreground">(Opsional, contoh: BAYAR ONGKIR)</span>
              </Label>
              <Input
                id="keterangan"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="cth: BAYAR ONGKIR, KOMISI, dll"
              />
            </div>

            {/* Upload Bukti */}
            <div className="space-y-2">
              <Label>Bukti Transfer <span className="text-xs text-muted-foreground">(Opsional, maks 3MB)</span></Label>
              {proofFile ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <div className="flex-1 text-sm truncate">{proofFile.name}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500"
                    onClick={() => setProofFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="proofUpload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Klik untuk upload</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, PDF (max 3MB)</span>
                  <input
                    id="proofUpload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
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
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
