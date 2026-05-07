'use client';

import { useState, useEffect } from 'react';
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
import { History, Pencil, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoricalRecord {
  id: string;
  amount: string;
  settlementDate: string;
  bankName: string | null;
  buyerName: string | null;
  notes: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export function HistoricalSettlementModal({ isOpen, onClose }: Props) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'form' | 'list'>('form');
  const [editId, setEditId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchList = async () => {
    if (!accessToken) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`${API}/finance/historical-settlements`, { withCredentials: true, headers });
      setRecords(res.data.data || []);
    } catch {
      toast.error('Gagal memuat riwayat');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'list' && accessToken) fetchList();
  }, [isOpen, tab, accessToken]);

  const resetForm = () => {
    setEditId(null);
    setAmount('');
    setSettlementDate('');
    setBankName('');
    setBuyerName('');
    setNotes('');
  };

  const handleEdit = (r: HistoricalRecord) => {
    setEditId(r.id);
    setAmount(String(parseFloat(r.amount)));
    setSettlementDate(r.settlementDate?.slice(0, 10) ?? '');
    setBankName(r.bankName ?? '');
    setBuyerName(r.buyerName ?? '');
    setNotes(r.notes ?? '');
    setTab('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pelunasan piutang historis ini?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API}/finance/historical-settlement/${id}`, { withCredentials: true, headers });
      toast.success('Berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !settlementDate) {
      toast.error('Jumlah dan tanggal cair wajib diisi');
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        await axios.put(
          `${API}/finance/historical-settlement/${editId}`,
          { amount: parseFloat(amount), settlementDate, bankName, buyerName, notes },
          { withCredentials: true, headers }
        );
        toast.success('Berhasil diperbarui');
      } else {
        await axios.post(
          `${API}/finance/historical-settlement`,
          { amount: parseFloat(amount), settlementDate, bankName, buyerName, notes },
          { withCredentials: true, headers }
        );
        toast.success('Pelunasan piutang historis berhasil dicatat');
      }
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      resetForm();
      setTab('list');
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setTab('form');
    onClose();
  };

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            Pelunasan Piutang Historis
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => { resetForm(); setTab('form'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'form' ? 'border-purple-600 text-purple-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {editId ? 'Edit Data' : 'Tambah Baru'}
          </button>
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'list' ? 'border-purple-600 text-purple-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Riwayat
          </button>
        </div>

        {tab === 'form' && (
          <>
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-xs text-purple-700 dark:text-purple-300">
              {editId
                ? 'Edit data pelunasan piutang historis. Ubah tanggal jika perlu disesuaikan dengan periode pencairan.'
                : 'Gunakan ini untuk mencatat pencairan piutang dari bulan sebelumnya yang tidak ada data penjualannya di sistem (misal: piutang Februari yang baru cair di Maret via BRI/BCA).'}
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
                  <Input placeholder="Ahmad" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Via Bank</Label>
                  <Input placeholder="BRI / BCA / dll" value={bankName} onChange={e => setBankName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Keterangan</Label>
                <Input placeholder="Opsional" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); if (editId) setTab('list'); else handleClose(); }}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Pelunasan'}
              </Button>
            </DialogFooter>
          </>
        )}

        {tab === 'list' && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {loadingList ? (
              <p className="text-sm text-muted-foreground text-center py-4">Memuat...</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data pelunasan piutang historis.</p>
            ) : records.map(r => (
              <div key={r.id} className="flex items-start justify-between border rounded-lg p-3 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{formatIDR(parseFloat(r.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.settlementDate)}{r.bankName ? ` · ${r.bankName}` : ''}{r.buyerName ? ` · ${r.buyerName}` : ''}</p>
                  {r.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
