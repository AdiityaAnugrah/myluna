'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales, useDeleteSale } from '@/lib/hooks/useSales';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus, Pencil, Trash2, Eye, Loader2, AlertTriangle, Download,
  Search, Filter, Calendar, ChevronLeft, ChevronRight, X, ShoppingCart,
  TrendingUp, Clock, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatStatus } from '@/lib/utils/format';
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from '@/lib/utils/exportUtils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CancelSaleDialog } from '@/components/sales/CancelSaleDialog';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
    typeof value === 'string' ? parseFloat(value) : value
  );

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'WAITING_APPROVAL', label: 'Menunggu Proses' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'PROCESSED', label: 'Diproses' },
  { value: 'SETTLED', label: 'Disetorkan' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'REJECTED', label: 'Ditolak' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'Semua Platform' },
  { value: 'OFFLINE_STORE', label: 'Toko Langsung' },
  { value: 'TOKOPEDIA', label: 'Tokopedia' },
  { value: 'SHOPEE', label: 'Shopee' },
  { value: 'TIKTOK_SHOP', label: 'TikTok Shop' },
  { value: 'LAZADA', label: 'Lazada' },
  { value: 'OTHER', label: 'Lainnya' },
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'Semua Pembayaran' },
  { value: 'CASH', label: 'Cash' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'CREDIT', label: 'Kredit' },
];

function getStatusBadge(status: string, isCancelPending?: boolean) {
  if (isCancelPending) {
    return <Badge variant="secondary" className="text-xs whitespace-nowrap">Menunggu Persetujuan Batal</Badge>;
  }
  const map: Record<string, { label: string; className: string }> = {
    WAITING_APPROVAL: { label: 'Menunggu Proses', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    APPROVED:         { label: 'Disetujui',        className: 'bg-blue-100 text-blue-800 border-blue-200' },
    PROCESSED:        { label: 'Diproses',          className: 'bg-purple-100 text-purple-800 border-purple-200' },
    SETTLED:          { label: 'Disetorkan',        className: 'bg-green-100 text-green-800 border-green-200' },
    CANCELLED:        { label: 'Dibatalkan',        className: 'bg-red-100 text-red-800 border-red-200' },
    REJECTED:         { label: 'Ditolak',           className: 'bg-red-100 text-red-800 border-red-200' },
    COMPLETED:        { label: 'Selesai',            className: 'bg-green-100 text-green-800 border-green-200' },
    PENDING:          { label: 'Menunggu',           className: 'bg-gray-100 text-gray-700 border-gray-200' },
  };
  const cfg = map[status] || { label: formatStatus(status), className: '' };
  return <Badge variant="outline" className={cn('text-xs whitespace-nowrap', cfg.className)}>{cfg.label}</Badge>;
}

export default function SalesPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);

  const isEnabled = user?.role !== 'TCP';

  const { data, isLoading } = useSales(
    {
      page: currentPage,
      limit: pageSize,
      status: statusFilter || undefined,
      platform: platformFilter || undefined,
      paymentMethod: paymentFilter || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate ? `${endDate}T23:59:59` : undefined,
    },
    { enabled: isEnabled }
  );

  const deleteMutation = useDeleteSale();

  const sales = data?.data?.sales || [];
  const pagination = data?.data?.pagination;

  const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd   = new Date().toISOString().split('T')[0];
  const hasActiveFilter = !!(statusFilter || platformFilter || paymentFilter || search || startDate !== defaultStart || endDate !== defaultEnd);

  const resetFilters = () => {
    const d = new Date();
    setSearch('');
    setSearchInput('');
    setStatusFilter('');
    setPlatformFilter('');
    setPaymentFilter('');
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const applySearch = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v === 'all' ? '' : v);
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => { setSaleToDelete(id); setDeleteConfirmOpen(true); };
  const confirmDelete = () => {
    if (saleToDelete) { deleteMutation.mutate(saleToDelete); setSaleToDelete(null); }
  };

  const handleExport = async () => {
    if (!sales.length) return;
    const exportData = sales.map((sale: any) => ({
      'No. Penjualan': sale.saleNumber,
      'Tanggal': formatDateForExport(sale.saleDate),
      'Pelanggan': sale.customerName || 'Pelanggan Umum',
      'Platform': formatStatus(sale.platform),
      'Pembayaran': formatStatus(sale.paymentMethod),
      'Total': formatCurrencyForExport(sale.totalAmount),
      'Status': formatStatus(sale.status),
      'Catatan': sale.notes || '-',
    }));
    await exportToExcel(
      exportData,
      [
        { header: 'No. Penjualan', key: 'No. Penjualan', width: 20 },
        { header: 'Tanggal', key: 'Tanggal', width: 15 },
        { header: 'Pelanggan', key: 'Pelanggan', width: 25 },
        { header: 'Platform', key: 'Platform', width: 15 },
        { header: 'Pembayaran', key: 'Pembayaran', width: 15 },
        { header: 'Total', key: 'Total', width: 18 },
        { header: 'Status', key: 'Status', width: 15 },
        { header: 'Catatan', key: 'Catatan', width: 30 },
      ],
      `Penjualan_${new Date().toISOString().split('T')[0]}`,
      'Daftar Penjualan'
    );
  };

  if (user?.role === 'TCP') {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-card border shadow-lg max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Akses Ditolak</h3>
            <p className="text-muted-foreground mt-2">Kamu tidak mempunyai akses ke fitur itu.</p>
          </div>
          <Button onClick={() => router.push('/')} variant="default" className="w-full">
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan' }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Pesanan Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola semua transaksi penjualan.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" disabled={!sales.length}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/sales/new">
            <Button className="tour-sales-add">
              <Plus className="mr-2 h-4 w-4" />
              Penjualan Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      {pagination && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in [animation-delay:50ms]">
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ShoppingCart className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Data</p>
              <p className="text-xl font-black text-blue-600">{pagination.total}</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-4 w-4 text-yellow-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menunggu Proses</p>
              <p className="text-xl font-black text-yellow-600">
                {sales.filter((s: any) => s.status === 'WAITING_APPROVAL').length}
              </p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Disetorkan</p>
              <p className="text-xl font-black text-green-600">
                {sales.filter((s: any) => s.status === 'SETTLED').length}
              </p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Halaman Ini</p>
              <p className="text-xl font-black text-primary">
                {formatCurrency(sales.reduce((s: number, sale: any) => s + parseFloat(sale.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3 animate-in [animation-delay:100ms]">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="h-4 w-4" />
          FILTER DATA
          {hasActiveFilter && (
            <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-normal">
              <X className="h-3 w-3" /> Reset Filter
            </button>
          )}
        </div>

        {/* Row 1: Search + Status + Platform + Payment */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="flex gap-2 md:col-span-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="No. invoice, pelanggan..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={applySearch} className="shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Status */}
          <Select value={statusFilter || 'all'} onValueChange={handleFilterChange(setStatusFilter)}>
            <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Platform */}
          <Select value={platformFilter || 'all'} onValueChange={handleFilterChange(setPlatformFilter)}>
            <SelectTrigger><SelectValue placeholder="Semua Platform" /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Payment */}
          <Select value={paymentFilter || 'all'} onValueChange={handleFilterChange(setPaymentFilter)}>
            <SelectTrigger><SelectValue placeholder="Semua Pembayaran" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Date range + page size */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} className="pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} className="pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Tampilkan Per Halaman</label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n} data</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3 animate-in fade-in-50">
        {isLoading ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Memuat data...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-muted-foreground text-sm">Tidak ada penjualan ditemukan</p>
          </div>
        ) : (
          sales.map((sale: any, index: number) => (
            <div key={sale.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-mono font-bold text-xs tracking-tight">{sale.saleNumber}</div>
                  <div className="text-[10px] text-muted-foreground">{format(new Date(sale.saleDate), 'dd MMM yyyy')}</div>
                </div>
                {getStatusBadge(sale.status, sale.isCancelPending)}
              </div>
              <div className="space-y-1 mb-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span className="font-medium truncate max-w-[160px]">{sale.customerName || 'Pelanggan Umum'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">{formatStatus(sale.platform)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{formatCurrency(sale.totalAmount)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t">
                <Link href={`/sales/${sale.id}`} className="col-span-1">
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Detail</Button>
                </Link>
                {sale.status === 'PENDING' && (
                  <>
                    <Link href={`/sales/${sale.id}/edit`}>
                      <Button variant="outline" size="sm" className="w-full h-7"><Pencil className="h-3 w-3" /></Button>
                    </Link>
                    <Button variant="destructive" size="sm" className="w-full h-7" onClick={() => handleDelete(sale.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {user?.role === 'USER' && !['CANCELLED', 'COMPLETED', 'SETTLED', 'PROCESSED', 'APPROVED'].includes(sale.status) && !sale.isCancelPending && (
                  <Button variant="destructive" size="sm" className="col-span-2 w-full h-7 text-xs" onClick={() => { setSaleToCancel(sale.id); setCancelDialogOpen(true); }}>
                    Ajukan Batal
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:150ms] tour-sales-list">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <ShoppingCart className="h-12 w-12" />
                    <p className="text-sm">Tidak ada penjualan ditemukan</p>
                    {hasActiveFilter && <p className="text-xs">Coba ubah filter pencarian</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale: any, index: number) => (
                <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">{sale.saleNumber}</TableCell>
                  <TableCell className="text-sm">{format(new Date(sale.saleDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium text-sm">{sale.customerName || 'Pelanggan Umum'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{formatStatus(sale.platform)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{formatStatus(sale.paymentMethod)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell>{getStatusBadge(sale.status, sale.isCancelPending)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/sales/${sale.id}`}>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                          <Eye className="h-3.5 w-3.5 mr-1" />Detail
                        </Button>
                      </Link>
                      {sale.status === 'PENDING' && (
                        <>
                          <Link href={`/sales/${sale.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(sale.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </>
                      )}
                      {user?.role === 'USER' && !['CANCELLED', 'COMPLETED', 'SETTLED', 'PROCESSED', 'APPROVED'].includes(sale.status) && !sale.isCancelPending && (
                        <Button variant="destructive" size="sm" className="h-8 px-2 text-xs" onClick={() => { setSaleToCancel(sale.id); setCancelDialogOpen(true); }}>
                          Ajukan Batal
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pagination.total)} dari {pagination.total} data
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (pagination.totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                  }
                  if (pageNum <= 0 || pageNum > pagination.totalPages) return null;
                  return (
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(pageNum)} disabled={isLoading}>
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages || isLoading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Penjualan"
        description="Apakah Anda yakin ingin menghapus penjualan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />
      <CancelSaleDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen} saleId={saleToCancel} />
    </div>
  );
}
