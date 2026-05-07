'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoricalSettlementModal({ isOpen, onClose }: Props) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !settlementDate) {
      toast.error('Jumlah dan tanggal cair wajib diisi');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/historical-settlement`,
        { amount: parseFloat(amount.replace(/\D/g, '')), settlementDate, bankName, buyerName, notes },
        { withCredentials: true, headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success('Pelunasan piutang historis berhasil dicatat');
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setSettlementDate('');
    setBankName('');
    setBuyerName('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            Catat Pelunasan Piutang Historis
          </DialogTitle>
        </DialogHeader>

        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-xs text-purple-700 dark:text-purple-300">
          Gunakan ini untuk mencatat pencairan piutang dari bulan sebelumnya yang tidak ada data penjualannya di sistem (misal: piutang Februari yang baru cair di Maret via BRI/BCA).
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Jumlah Cair (Rp) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              placeholder="5000000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal Cair <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={settlementDate}
              onChange={e => setSettlementDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Pembeli</Label>
              <Input
                placeholder="Ahmad"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Via Bank</Label>
              <Input
                placeholder="BRI / BCA / dll"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Keterangan</Label>
            <Input
              placeholder="Opsional"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Batal</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? 'Menyimpan...' : 'Simpan Pelunasan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
