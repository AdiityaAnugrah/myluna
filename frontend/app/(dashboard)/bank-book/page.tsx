'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BookOpenCheck,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useSettlementConfirmationRequests, useSettlements } from '@/lib/hooks/useSettlements';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';

type BankBookRow = {
  id: string;
  source: 'SETTLEMENT' | 'REQUEST';
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  grossAmount: number;
  netAmount: number;
  difference: number;
  settlementDate: string;
  inputDate: string;
  responsibleName: string;
  statusLabel: string;
  statusTone: 'ready' | 'pending';
  notes?: string;
};

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const parseAmount = (value: string) => Number(value.replace(/[^0-9]/g, '') || 0);

export default function BankBookPage() {
  const { user } = useAuthStore();
  const [bankDate, setBankDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState('BCA');
  const [bankAmountInput, setBankAmountInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'SETTLEMENT' | 'REQUEST'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';

  const { data: settlementsData, isLoading: isLoadingSettlements } = useSettlements(
    {
      page: 1,
      limit: 200,
      status: 'settled',
      sortBy: 'terbaru',
      userId: user?.id,
    } as any,
    { enabled: isAdmin }
  );

  const { data: requestsData, isLoading: isLoadingRequests } = useSettlementConfirmationRequests(
    {
      page: 1,
      limit: 200,
      status: 'PENDING',
    },
    { enabled: isAdmin }
  );

  const rows = useMemo<BankBookRow[]>(() => {
    const settlements = ((settlementsData as any)?.data?.settlements || []).map((item: any) => {
      const sale = item.sale || {};
      const gross = Number(sale.totalAmount || 0);
      const net = Number(item.netAmount || 0);
      return {
        id: `SETTLEMENT:${item.id}`,
        source: 'SETTLEMENT' as const,
        invoiceNumber: sale.saleNumber || item.invoiceNumber || '-',
        customerName: sale.customerName || '-',
        customerPhone: sale.customerPhone || '-',
        grossAmount: gross,
        netAmount: net,
        difference: Math.max(gross - net, 0),
        settlementDate: toDateInput(item.settlementDate),
        inputDate: item.createdAt || item.updatedAt || item.settlementDate,
        responsibleName: sale.creator?.fullName || item.creator?.fullName || '-',
        statusLabel: 'Siap dicocokkan',
        statusTone: 'ready' as const,
        notes: item.notes || '',
      };
    });

    const pendingRequests = ((requestsData as any)?.data?.requests || []).map((request: any) => {
      const sale = request.sale || {};
      const gross = Number(sale.totalAmount || 0);
      const net = Number(request.netAmount || 0);
      return {
        id: `REQUEST:${request.id}`,
        source: 'REQUEST' as const,
        invoiceNumber: sale.saleNumber || request.invoiceNumber || '-',
        customerName: sale.customerName || '-',
        customerPhone: sale.customerPhone || '-',
        grossAmount: gross,
        netAmount: net,
        difference: Math.max(gross - net, 0),
        settlementDate: toDateInput(request.settlementDate),
        inputDate: request.createdAt || request.settlementDate,
        responsibleName: request.requester?.fullName || sale.creator?.fullName || '-',
        statusLabel: 'Pending lama',
        statusTone: 'pending' as const,
        notes: request.notes || '',
      };
    });

    return [...pendingRequests, ...settlements].sort((a, b) => {
      const dateA = a.settlementDate || '9999-12-31';
      const dateB = b.settlementDate || '9999-12-31';
      return dateA.localeCompare(dateB);
    });
  }, [settlementsData, requestsData]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !keyword || [
        row.invoiceNumber,
        row.customerName,
        row.customerPhone,
        row.responsibleName,
        row.netAmount.toLocaleString('id-ID'),
        row.settlementDate,
      ].join(' ').toLowerCase().includes(keyword);

      const matchesDate = dateFilter === 'all' || row.settlementDate === dateFilter;
      const matchesSource = sourceFilter === 'all' || row.source === sourceFilter;
      return matchesSearch && matchesDate && matchesSource;
    });
  }, [rows, search, dateFilter, sourceFilter]);

  const uniqueDates = useMemo(
    () => Array.from(new Set(rows.map((row) => row.settlementDate).filter(Boolean))).sort(),
    [rows]
  );

  const bankAmount = parseAmount(bankAmountInput);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.netAmount, 0);
  const difference = bankAmount - selectedTotal;
  const isMatch = bankAmount > 0 && selectedRows.length > 0 && difference === 0;
  const isOver = selectedTotal > bankAmount && bankAmount > 0;
  const isLoading = isLoadingSettlements || isLoadingRequests;

  const toggleRow = (id: string, checked: boolean | string) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  };

  const toggleAllVisible = (checked: boolean | string) => {
    const visibleIds = filteredRows.map((row) => row.id);
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleIds]));
      return current.filter((id) => !visibleIds.includes(id));
    });
  };

  const handleCopyInvoice = async (invoiceNumber: string) => {
    await navigator.clipboard.writeText(invoiceNumber);
    setCopiedInvoice(invoiceNumber);
    toast.success('No invoice disalin');
    window.setTimeout(() => setCopiedInvoice(null), 1200);
  };

  const handleSaveDraft = () => {
    if (!isMatch) {
      toast.warning('Total centang harus sama dengan nominal bank dulu.');
      return;
    }
    toast.success('Draft UI Buku Bank sudah cocok. Tahap berikutnya sambungkan ke backend riwayat Buku Bank.');
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40">
              <AlertCircle className="h-7 w-7" />
            </div>
            <CardTitle>Akses Buku Bank</CardTitle>
            <CardDescription>Fitur ini untuk Admin, Super Admin, dan DEV.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Keuangan' }, { label: 'Buku Bank' }]} />

      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-50 via-background to-blue-50 p-5 shadow-sm dark:from-emerald-950/25 dark:via-background dark:to-blue-950/20 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                <BookOpenCheck className="mr-1 h-3.5 w-3.5" />
                Rekonsiliasi Pelunasan
              </Badge>
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                Berdasarkan tanggal pelunasan
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Buku Bank</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Input nominal uang masuk dari rekening, lalu centang pelunasan yang sesuai. Jika total yang dicentang sama dengan nominal bank,
              data dianggap cocok dan siap masuk riwayat Buku Bank.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <WalletCards className="h-4 w-4 text-emerald-600" /> Nominal Bank
              </div>
              <p className="mt-2 text-xl font-black tabular-nums">{formatCurrency(bankAmount)}</p>
            </div>
            <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Calculator className="h-4 w-4 text-blue-600" /> Total Dicentang
              </div>
              <p className="mt-2 text-xl font-black tabular-nums">{formatCurrency(selectedTotal)}</p>
            </div>
            <div className={cn(
              'rounded-2xl border p-4 shadow-sm',
              isMatch ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100' :
              isOver ? 'border-red-300 bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100' :
              'bg-background/80'
            )}>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {isMatch ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : isOver ? <XCircle className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-orange-600" />}
                Selisih
              </div>
              <p className="mt-2 text-xl font-black tabular-nums">{formatCurrency(Math.abs(difference))}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-5 w-5 text-primary" />
                1. Input Mutasi Bank
              </CardTitle>
              <CardDescription>Isi sesuai uang masuk yang terlihat di rekening.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="bankDate">Tanggal Bank</Label>
                <Input id="bankDate" type="date" value={bankDate} onChange={(event) => setBankDate(event.target.value)} />
                <p className="text-xs text-muted-foreground">Tanggal uang masuk di mutasi rekening.</p>
              </div>

              <div className="space-y-2">
                <Label>Rekening / Bank</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCA">BCA</SelectItem>
                    <SelectItem value="MANDIRI">Mandiri</SelectItem>
                    <SelectItem value="BRI">BRI</SelectItem>
                    <SelectItem value="BNI">BNI</SelectItem>
                    <SelectItem value="LAINNYA">Bank lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAmount">Nominal Uang Masuk</Label>
                <Input
                  id="bankAmount"
                  inputMode="numeric"
                  placeholder="Contoh: 15000000"
                  value={bankAmountInput}
                  onChange={(event) => setBankAmountInput(event.target.value)}
                  className="text-lg font-bold tabular-nums"
                />
                <p className="text-xs text-muted-foreground">Sistem akan membandingkan nominal ini dengan total pelunasan yang dicentang.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contoh: mutasi BCA 15 Agustus, transfer marketplace"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                3. Status Pencocokan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-semibold">{bankName}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span className="font-semibold">{bankDate ? format(new Date(`${bankDate}T00:00:00`), 'dd MMM yyyy', { locale: idLocale }) : '-'}</span>
                </div>
                <Separator className="my-3" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Nominal bank</span><strong>{formatCurrency(bankAmount)}</strong></div>
                  <div className="flex justify-between"><span>Total dicentang</span><strong>{formatCurrency(selectedTotal)}</strong></div>
                  <div className="flex justify-between"><span>Jumlah invoice</span><strong>{selectedRows.length}</strong></div>
                </div>
              </div>

              <div className={cn(
                'rounded-2xl border p-4 text-sm',
                isMatch ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100' :
                isOver ? 'border-red-300 bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100' :
                'border-orange-300 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100'
              )}>
                <div className="flex gap-3">
                  {isMatch ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : isOver ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />}
                  <div>
                    <p className="font-bold">
                      {isMatch ? 'Cocok. Siap disimpan ke riwayat.' : isOver ? 'Total centang melebihi nominal bank.' : 'Masih perlu dicocokkan.'}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {isMatch
                        ? 'Setelah backend disambungkan, pelunasan terpilih akan ditandai Sudah Masuk Buku Bank.'
                        : 'Centang pelunasan sampai totalnya sama persis dengan nominal mutasi bank.'}
                    </p>
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={!isMatch} onClick={handleSaveDraft}>
                <BookOpenCheck className="mr-2 h-4 w-4" />
                Simpan Rekonsiliasi
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  2. Pilih Data Pelunasan
                </CardTitle>
                <CardDescription className="mt-1">
                  Data diambil berdasarkan <strong>tanggal pelunasan</strong>. Pending lama ikut tampil supaya bisa dialihkan ke Buku Bank.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background">{filteredRows.length} data tampil</Badge>
                <Badge variant="outline" className="bg-background">{selectedRows.length} dicentang</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-3 border-b bg-background p-4 lg:grid-cols-[1fr_190px_190px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari invoice, pelanggan, nominal, penanggung jawab..."
                  className="pl-9"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tanggal</SelectItem>
                  {uniqueDates.map((date) => (
                    <SelectItem key={date} value={date}>{format(new Date(`${date}T00:00:00`), 'dd MMM yyyy', { locale: idLocale })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as any)}>
                <SelectTrigger><SelectValue placeholder="Sumber" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua sumber</SelectItem>
                  <SelectItem value="REQUEST">Pending lama</SelectItem>
                  <SelectItem value="SETTLEMENT">Pelunasan resmi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id))}
                        onCheckedChange={toggleAllVisible}
                        aria-label="Pilih semua data tampil"
                      />
                    </TableHead>
                    <TableHead>No Invoice</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Tgl Pelunasan</TableHead>
                    <TableHead className="text-right">Dana Bersih</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Penanggung Jawab</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center">
                        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Memuat data pelunasan...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center text-muted-foreground">
                        <BookOpenCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
                        <p className="font-medium">Data pelunasan belum ditemukan</p>
                        <p className="mt-1 text-xs">Coba ubah filter tanggal, sumber, atau kata kunci pencarian.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const selected = selectedIds.includes(row.id);
                      return (
                        <TableRow key={row.id} className={cn(selected && 'bg-emerald-50/70 dark:bg-emerald-950/20')}>
                          <TableCell>
                            <Checkbox checked={selected} onCheckedChange={(checked) => toggleRow(row.id, checked)} aria-label={`Pilih ${row.invoiceNumber}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold">{row.invoiceNumber}</span>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopyInvoice(row.invoiceNumber)}>
                                {copiedInvoice === row.invoiceNumber ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{row.customerName}</div>
                            <div className="text-xs text-muted-foreground">{row.customerPhone}</div>
                          </TableCell>
                          <TableCell>
                            {row.settlementDate ? format(new Date(`${row.settlementDate}T00:00:00`), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                            <div className="text-xs text-muted-foreground">input {row.inputDate ? format(new Date(row.inputDate), 'dd MMM HH:mm', { locale: idLocale }) : '-'}</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(row.netAmount)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(row.difference)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                row.statusTone === 'ready'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                                  : 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
                              )}
                            >
                              {row.statusTone === 'ready' ? <Banknote className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}
                              {row.statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.responsibleName}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t bg-muted/20 p-4">
              <div className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Aturan mudahnya</p>
                    <p className="text-sm text-muted-foreground">Nominal bank harus sama persis dengan total dana bersih yang dicentang.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hasil akhir</p>
                  <p className={cn('text-lg font-black', isMatch ? 'text-emerald-600' : isOver ? 'text-red-600' : 'text-orange-600')}>
                    {isMatch ? 'COCOK' : isOver ? 'KELEBIHAN CENTANG' : 'BELUM COCOK'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Buku Bank</CardTitle>
          <CardDescription>
            Nanti setelah backend dibuat, hasil rekonsiliasi tersimpan di sini lengkap dengan tanggal bank, nominal, invoice terpilih, admin pemroses, dan catatan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            <BookOpenCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Riwayat akan muncul setelah fitur penyimpanan Buku Bank disambungkan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
