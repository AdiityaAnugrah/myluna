'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

import { useAuth } from '@/lib/hooks/useAuth';

interface SetInitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetInitialBalanceModal({ isOpen, onClose }: SetInitialBalanceModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const queryClient = useQueryClient();
  const { accessToken } = useAuth(); // Get token from auth context

  const mutation = useMutation({
    mutationFn: async ({ initialAmount, adminPassword }: { initialAmount: number, adminPassword: string }) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/initial-receivable`,
        { amount: initialAmount, adminPassword },
        { 
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Saldo awal piutang berhasil diatur');
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      setAmount('');
      setPassword('');
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal mengatur saldo awal';
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Parse the value, removing formatting if any
    const rawValue = amount.replace(/[^0-9]/g, '');
    const numValue = parseInt(rawValue, 10);
    
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Masukkan nominal yang valid');
      return;
    }
    if (!password) {
      toast.error('Password wajib diisi');
      return;
    }

    mutation.mutate({ initialAmount: numValue, adminPassword: password });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic formatting for IDR on the fly
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw) {
      const formatted = new Intl.NumberFormat('id-ID').format(parseInt(raw, 10));
      setAmount(formatted);
    } else {
      setAmount('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Saldo Awal Piutang</DialogTitle>
            <DialogDescription>
              Masukkan total piutang yang masih berjalan (dari sistem lama) sebelum menggunakan Lunarea.
              <br/><br/>
              <strong className="text-red-500">Peringatan:</strong> Aksi ini hanya dapat dilakukan <strong>SATU KALI</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Nominal Saldo Awal (Rp)</Label>
              <Input
                id="amount"
                type="text"
                placeholder="Contoh: 5.000.000"
                value={amount}
                onChange={handleAmountChange}
                disabled={mutation.isPending}
                required
              />
            </div>
            <div className="grid gap-2 mt-2">
              <Label htmlFor="password">Password Super Admin</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending || !amount || !password}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Saldo Awal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
