'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Eye, FileText, Image, Loader2, X, Search, ChevronRight } from 'lucide-react';

interface OtherIncome {
  id: string;
  transactionDate: string;
  bankName: string;
  buyerName: string;
  amount: string;
  notes?: string;
  proofDocument?: string;
  createdAt: string;
  creator?: { id: string; fullName: string; email: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useOtherIncomes() {
  return useQuery({
    queryKey: ['other-incomes-list'],
    queryFn: async () => {
      const { data } = await apiClient.get('/other-incomes?limit=100');
      return data.data?.otherIncomes as OtherIncome[];
    },
  });
}

const formatCurrency = (val: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(val));

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export function OtherIncomeListDialog({ open, onOpenChange }: Props) {
  const { data: incomes, isLoading } = useOtherIncomes();
  const [selectedIncome, setSelectedIncome] = useState<OtherIncome | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

  const getProofUrl = (filename: string) =>
    `${apiBase}/uploads/proofs/${filename.replace(/\\/g, '/').split('/').pop()}`;

  const isPdf = (path: string) => path.toLowerCase().endsWith('.pdf');

  const filteredIncomes = (incomes || []).filter((income: OtherIncome) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      income.buyerName.toLowerCase().includes(searchLower) ||
      (income.notes || '').toLowerCase().includes(searchLower) ||
      income.bankName.toLowerCase().includes(searchLower)
    );
  });

  const totalAmount = filteredIncomes.reduce((sum: number, item: OtherIncome) => sum + Number(item.amount), 0);

  return (
    <>
      {/* Main List Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Daftar Pendapatan Lain-lain
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pembeli, ket, atau bank..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl"
                />
              </div>
              
              <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">Total Terpilih</span>
                  <span className="text-lg font-black text-primary leading-none">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 pb-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredIncomes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed">
                <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                   <Search className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">Data tidak ditemukan</p>
                {searchQuery && (
                   <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="mt-1">
                     Hapus pencarian
                   </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Tanggal</TableHead>
                        <TableHead className="font-bold">Bank / Metode</TableHead>
                        <TableHead className="font-bold">Nama Pembeli</TableHead>
                        <TableHead className="font-bold">Keterangan</TableHead>
                        <TableHead className="text-right font-bold">Jumlah</TableHead>
                        <TableHead className="text-center font-bold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncomes.map((income) => (
                        <TableRow key={income.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-sm font-medium">{formatDate(income.transactionDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-md font-mono text-[10px]">
                              {income.bankName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-semibold">{income.buyerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic max-w-[150px] truncate">
                            {income.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(income.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {income.proofDocument && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                                  onClick={() => {
                                    setSelectedIncome(income);
                                    setProofOpen(true);
                                  }}
                                  title="Lihat Bukti"
                                >
                                  {isPdf(income.proofDocument) ? (
                                    <FileText className="h-4 w-4" />
                                  ) : (
                                    <Image className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setSelectedIncome(income)}
                                title="Detail"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {filteredIncomes.map((income) => (
                    <div 
                      key={income.id} 
                      className="p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm active:scale-[0.98]"
                      onClick={() => setSelectedIncome(income)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {formatDate(income.transactionDate)}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5">{income.bankName}</Badge>
                      </div>
                      <div className="font-bold text-sm mb-1">{income.buyerName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mb-3">{income.notes || 'Tidak ada keterangan'}</div>
                      <div className="flex justify-between items-center bg-muted/50 -mx-4 -mb-4 p-3 rounded-b-2xl mt-2 border-t">
                         <span className="font-black text-primary text-sm">{formatCurrency(income.amount)}</span>
                         <div className="flex items-center gap-2">
                            {income.proofDocument && (
                               <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  {isPdf(income.proofDocument) ? <FileText className="h-3 w-3 text-primary" /> : <Image className="h-3 w-3 text-primary" />}
                               </div>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedIncome && !proofOpen && (
        <Dialog open={!!selectedIncome && !proofOpen} onOpenChange={() => setSelectedIncome(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Detail Pendapatan Lain-lain</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span className="font-medium">{formatDate(selectedIncome.transactionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank / Metode</span>
                <Badge variant="outline">{selectedIncome.bankName}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Pembeli</span>
                <span className="font-medium">{selectedIncome.buyerName}</span>
              </div>
              {selectedIncome.notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keterangan</span>
                  <span className="font-medium">{selectedIncome.notes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-bold text-blue-600">{formatCurrency(selectedIncome.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input Oleh</span>
                <span>{selectedIncome.creator?.fullName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Input</span>
                <span className="text-xs">{formatDate(selectedIncome.createdAt)}</span>
              </div>
              {selectedIncome.proofDocument && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setProofOpen(true)}
                >
                  {isPdf(selectedIncome.proofDocument!) ? (
                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                  ) : (
                    <Image className="h-4 w-4 mr-2 text-blue-500" />
                  )}
                  Lihat Bukti Transfer
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Proof Viewer Dialog */}
      {selectedIncome?.proofDocument && proofOpen && (
        <Dialog open={proofOpen} onOpenChange={(v) => { setProofOpen(v); if (!v) setSelectedIncome(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Bukti Transfer — {selectedIncome.buyerName}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 rounded-lg p-2">
              {isPdf(selectedIncome.proofDocument) ? (
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 text-red-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">File PDF tidak bisa ditampilkan di sini.</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(getProofUrl(selectedIncome.proofDocument!), '_blank')}
                  >
                    Buka PDF di Tab Baru
                  </Button>
                </div>
              ) : (
                <img
                  src={getProofUrl(selectedIncome.proofDocument)}
                  alt="Bukti Transfer"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Gagal memuat gambar';
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
