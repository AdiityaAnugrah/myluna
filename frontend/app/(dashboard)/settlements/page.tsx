'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSettlements,
  useRequestCancelSettlement,
} from '@/lib/hooks/useSettlements';
import { useRequestCancelSale } from '@/lib/hooks/useSales';
import { useUsers } from '@/lib/hooks/useUsers';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, AlertCircle, CheckCircle2, Clock, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { SettlementFormDialog } from '@/components/settlements/SettlementFormDialog';
import { OtherIncomeDialog } from '@/components/settlements/OtherIncomeDialog';
import { OtherIncomeListDialog } from '@/components/settlements/OtherIncomeListDialog';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

export default function SettlementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<'all' | 'pending' | 'settled'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'urgent' | 'terbaru'>('urgent');
  const [responsibleUserId, setResponsibleUserId] = useState<'all' | string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch, startDate, endDate, responsibleUserId]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  
  // Cancel related
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelType, setCancelType] = useState<'SALE' | 'SETTLEMENT'>('SETTLEMENT');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [otherIncomeOpen, setOtherIncomeOpen] = useState(false);
  const [otherIncomeListOpen, setOtherIncomeListOpen] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);
  const requestCancelMutation = useRequestCancelSettlement();
  const requestCancelSaleMutation = useRequestCancelSale();
  const { data: usersData } = useUsers({ page: 1, limit: 200 });
  const responsibleUserOptions = usersData?.data?.users || [];

  const { data, isLoading } = useSettlements(
    {
      page,
      limit,
      status: status === 'all' ? undefined : status,
      ...(startDate && endDate ? { startDate, endDate } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(responsibleUserId !== 'all' ? { responsibleUserId } : {}),
      sortBy,
      userId: user?.id, // Add userId for cache isolation
    },
    { 
      enabled: user?.role !== 'TCP',
      refetchOnWindowFocus: true, // Refetch when window gets focus
      refetchOnMount: true, // Refetch when component mounts
    }
  );

  if (user?.role === 'TCP') {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-card border shadow-lg max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Akses Ditolak</h3>
            <p className="text-muted-foreground mt-2">
              Kamu tidak mempunyai akses ke fitur ini.
            </p>
          </div>
          <Button onClick={() => router.push('/')} variant="default" className="w-full">
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const settlements = (data as any)?.data?.settlements || [];
  const pagination = (data as any)?.data?.pagination;

  const getDaysSinceProcessed = (processedAt: string) => {
    return differenceInDays(new Date(), new Date(processedAt));
  };

  const needsWarning = (sale: any) => {
    if (!sale.processedAt) return false;
    const days = getDaysSinceProcessed(sale.processedAt);
    return days >= 10 && days < 15; // Warning at 10-14 days
  };

  const isOverdue = (sale: any) => {
    if (!sale.processedAt) return false;
    const days = getDaysSinceProcessed(sale.processedAt);
    return days >= 15; // Overdue at 15 days or more
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy HH:mm');
  };

  const handleCreateSettlement = (sale: any) => {
    setSelectedSale(sale);
    setFormOpen(true);
  };

  const handleCopyInvoice = async (invoiceNumber: string) => {
    if (!invoiceNumber) return;
    await navigator.clipboard.writeText(invoiceNumber);
    setCopiedInvoice(invoiceNumber);
    toast.success('No invoice berhasil disalin');
    window.setTimeout(() => setCopiedInvoice(null), 1500);
  };

  const handleCancelClick = (id: string, type: 'SALE' | 'SETTLEMENT') => {
      setCancelId(id);
      setCancelType(type);
      setCancelReason("");
      setCancelOpen(true);
  };

  const submitCancellation = () => {
    if (cancelId && cancelReason.trim()) {
      const mutation = cancelType === 'SETTLEMENT' ? requestCancelMutation : requestCancelSaleMutation;
      
      mutation.mutate(
        { id: cancelId, reason: cancelReason },
        {
          onSuccess: () => {
            setCancelOpen(false);
            setCancelId(null);
            setCancelReason("");
          },
        }
      );
    }
  };

  // Backend returns data already sorted by sortBy param.
  // We still filter locally (search done server-side but may need local too for UX).
  const filteredSettlements = settlements.filter((item: any) => {
    if (!searchQuery) return true;
    const sale = item.sale || item;
    const searchLower = searchQuery.toLowerCase();
    return (
      sale?.saleNumber?.toLowerCase().includes(searchLower) ||
      sale?.customerName?.toLowerCase().includes(searchLower) ||
      sale?.customerPhone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Keuangan' }, { label: 'Pelunasan' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pelunasan Penjualan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola pelunasan dan dana bersih dari penjualan
          </p>
        </div>
        {user?.role !== 'TCP' && (
          <div className="flex items-center gap-2">
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV') && (
              <Button
                variant="outline"
                onClick={() => setOtherIncomeListOpen(true)}
              >
                Lihat Lain-lain
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setOtherIncomeOpen(true)}
            >
              Pendapatan Lain-lain
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
                <Label>Rentang Tanggal</Label>
                <div className="flex gap-2">
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                    />
                    <span className="flex items-center text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            <div className="space-y-2 tour-settlements-status">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="pending">Belum Lunas</SelectItem>
                  <SelectItem value="settled">Sudah Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Penanggung Jawab</Label>
              <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua penanggung jawab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua penanggung jawab</SelectItem>
                  {responsibleUserOptions.map((responsibleUser: any) => (
                    <SelectItem key={responsibleUser.id} value={responsibleUser.id}>
                      {responsibleUser.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label>Cari Penjualan</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="No. Penjualan, Nama, HP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-full">
              <Label>Urutkan</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('urgent')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    sortBy === 'urgent'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-background border-input text-foreground hover:bg-muted'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Terlama / Urgent Dulu
                </button>
                <button
                  onClick={() => setSortBy('terbaru')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    sortBy === 'terbaru'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input text-foreground hover:bg-muted'
                  }`}
                >
                  Terbaru Dulu
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="tour-settlements-list">
        <CardHeader>
          <CardTitle>Daftar Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3 animate-in fade-in-50">
                    {filteredSettlements.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                            Tidak ada data
                        </div>
                    ) : (
                        filteredSettlements.map((item: any) => {
                            const sale = item.sale || item;
                            const settlement = item.settlement || (item.netAmount ? item : null);
                            const isSettled = !!settlement;
                            const pendingSettlementRequest = sale.pendingSettlementRequest;
                            const daysSince = sale.processedAt ? getDaysSinceProcessed(sale.processedAt) : 0;
                            const warning = needsWarning(sale);
                            const overdue = isOverdue(sale);

                            return (
                                <div key={sale.id} className={cn(
                                    "rounded-lg border bg-card p-3 shadow-sm relative overflow-hidden",
                                    overdue && !isSettled && "border-l-4 border-l-red-500 bg-red-50/70 dark:bg-red-950/30"
                                )}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-[10px] text-muted-foreground">
                                            {format(new Date(sale.saleDate), 'dd MMM yyyy')}
                                        </div>
                                        <div className="scale-75 origin-top-right">
                                            {isSettled ? (
                                                <Badge variant="default" className="bg-green-600 h-5 px-1.5 text-[10px]">Lunas</Badge>
                                            ) : pendingSettlementRequest ? (
                                                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-300 h-5 px-1.5 text-[10px]">Menunggu Konfirmasi</Badge>
                                            ) : overdue ? (
                                                <Badge variant="destructive" className="animate-pulse h-5 px-1.5 text-[10px]">URGENT</Badge>
                                            ) : warning ? (
                                                <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-300 h-5 px-1.5 text-[10px]">Warning</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Pending</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] font-semibold">{sale.saleNumber || '-'}</span>
                                            {sale.saleNumber && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyInvoice(sale.saleNumber)}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="Copy No Invoice"
                                                >
                                                    {copiedInvoice === sale.saleNumber ? (
                                                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="font-bold text-[12px] truncate">{sale.customerName || '-'}</div>
                                        <div className="text-[10px] text-muted-foreground">{sale.customerPhone || '-'}</div>
                                        {sale?.creator?.fullName && (
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                PJ: <span className="font-medium text-foreground">{sale.creator.fullName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-2 bg-muted/30 p-2 rounded">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Total</span>
                                            <span className="font-semibold text-[11px]">{formatCurrency(sale.totalAmount)}</span>
                                        </div>
                                        {isSettled && settlement && (
                                            <div className="text-right">
                                                <span className="text-[10px] text-muted-foreground block">Bersih</span>
                                                <span className="font-bold text-[12px] text-green-600 dark:text-green-400">{formatCurrency(settlement.netAmount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isSettled && settlement && (
                                        <div className="mb-2 rounded-md border border-green-200 bg-green-50/60 p-2 text-[10px] dark:border-green-900 dark:bg-green-950/20">
                                            <div className="text-muted-foreground">Dikonfirmasi oleh</div>
                                            <div className="font-semibold text-foreground">
                                                {settlement.creator?.fullName || '-'}
                                            </div>
                                            <div className="mt-0.5 text-muted-foreground">
                                                {formatDateTime(settlement.createdAt)}
                                            </div>
                                        </div>
                                    )}

                                    {!isSettled && overdue && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-950/40 p-1.5 rounded mb-2">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>Telat {daysSince} hari (Deadline 15 hari)</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 mt-2">
                                        {!isSettled && pendingSettlementRequest && (
                                            <Button
                                                size="sm"
                                                disabled
                                                variant="outline"
                                                className="w-full h-8 text-[11px]"
                                            >
                                                Menunggu Konfirmasi
                                            </Button>
                                        )}
                                        {!isSettled && !pendingSettlementRequest && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleCreateSettlement(sale)}
                                                variant={warning || overdue ? 'destructive' : 'default'}
                                                className="w-full h-8 text-[11px]"
                                            >
                                                Input Pelunasan
                                            </Button>
                                        )}
                                        {isSettled && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/settlements/${item.id}`)}
                                                    className="flex-1 h-8 text-[11px]"
                                                >
                                                    Detail
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleCancelClick(item.id, 'SETTLEMENT')}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>No Invoice</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead className="text-right">Total (Kotor)</TableHead>
                        <TableHead className="text-right">Dana Bersih</TableHead>
                        <TableHead>Tgl Pelunasan</TableHead>
                        <TableHead>Dikonfirmasi</TableHead>
                        <TableHead>Penanggung Jawab</TableHead>
                        <TableHead>Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredSettlements.length === 0 ? (
                        <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            Tidak ada data
                        </TableCell>
                        </TableRow>
                    ) : (
                        filteredSettlements.map((item: any) => {
                        // Backend returns 2 structures:
                        // Pending: { sale: {...}, settlement: null } OR just Sale object
                        // Settled: Settlement object { id, netAmount, settlementDate, sale: {...} }
                        const sale = item.sale || item;
                        
                        // Check if this is a settled item:
                        // Either has settlement relation OR has netAmount directly (is Settlement object)
                        const settlement = item.settlement || (item.netAmount ? item : null);
                        const isSettled = !!settlement;
                        const pendingSettlementRequest = sale.pendingSettlementRequest;
                        
                        const daysSince = sale.processedAt ? getDaysSinceProcessed(sale.processedAt) : 0;
                        const warning = needsWarning(sale);
                        const overdue = isOverdue(sale);

                        return (
                            <TableRow key={sale.id} className={overdue && !isSettled ? 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500' : ''}>
                            <TableCell>
                                {isSettled ? (
                                <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Lunas
                                </Badge>
                                ) : pendingSettlementRequest ? (
                                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-300">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Menunggu Konfirmasi
                                </Badge>
                                ) : overdue ? (
                                <Badge variant="destructive" className="animate-pulse">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    URGENT - {daysSince} hari (Deadline 15 hari!)
                                </Badge>
                                ) : warning ? (
                                <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-300">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {daysSince} hari (Deadline 15 hari)
                                </Badge>
                                ) : (
                                <Badge variant="secondary">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Pending ({daysSince} hari)
                                </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium">{sale.saleNumber || '-'}</span>
                                  {sale.saleNumber && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleCopyInvoice(sale.saleNumber)}
                                      title="Copy No Invoice"
                                    >
                                      {copiedInvoice === sale.saleNumber ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {new Date(sale.saleDate).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell>
                                <div>
                                <div className="font-medium">
                                    {sale.customerName || '-'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {sale.customerPhone || '-'}
                                </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                                {formatCurrency(sale.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                                {isSettled && settlement ? (
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                    {formatCurrency(settlement.netAmount)}
                                </span>
                                ) : (
                                <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {isSettled && settlement
                                ? new Date(settlement.settlementDate).toLocaleDateString('id-ID')
                                : '-'}
                            </TableCell>
                            <TableCell>
                                {isSettled && settlement ? (
                                  <div className="min-w-[150px]">
                                    <div className="text-sm font-medium text-foreground">
                                      {settlement.creator?.fullName || '-'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDateTime(settlement.createdAt)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {sale?.creator?.fullName || '-'}
                            </TableCell>
                            <TableCell>
                                {!isSettled && pendingSettlementRequest && (
                                <Button
                                    size="sm"
                                    disabled
                                    variant="outline"
                                >
                                    Menunggu Konfirmasi
                                </Button>
                                )}
                                {!isSettled && !pendingSettlementRequest && (
                                <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleCreateSettlement(sale)}
                                    variant={warning ? 'destructive' : 'default'}
                                >
                                    Input Pelunasan
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => handleCancelClick(sale.id, 'SALE')}
                                    title="Ajukan Pembatalan Penjualan"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </div>
                                )}
                                {isSettled && (
                                    <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push(`/settlements/${settlement.id}`)}
                                    >
                                        Detail
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleCancelClick(settlement.id, 'SETTLEMENT')}
                                        title="Ajukan Pembatalan Pelunasan"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </div>
                                )}
                            </TableCell>
                            </TableRow>
                        );
                        })
                    )}
                    </TableBody>
                </Table>
                </div>
            </>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 pt-4 border-t">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={limit}
                onPageChange={(p) => setPage(p)}
                onItemsPerPageChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <SettlementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sale={selectedSale}
        onSuccess={() => {
          setFormOpen(false);
          setSelectedSale(null);
        }}
      />

      {/* Other Income Dialog */}
      <OtherIncomeDialog
        open={otherIncomeOpen}
        onOpenChange={setOtherIncomeOpen}
      />

      {/* Other Income List Dialog — Admin/Super Admin only */}
      <OtherIncomeListDialog
        open={otherIncomeListOpen}
        onOpenChange={setOtherIncomeListOpen}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {cancelType === 'SETTLEMENT' ? 'Ajukan Pembatalan Pelunasan' : 'Ajukan Pembatalan Penjualan'}
            </DialogTitle>
            <DialogDescription>
              {cancelType === 'SETTLEMENT'
                ? 'Jelaskan alasan pembatalan pelunasan ini. Permintaan akan dikirimkan ke Admin untuk ditinjau.'
                : 'Jelaskan alasan pembatalan penjualan ini. Permintaan akan dikirimkan ke Admin untuk ditinjau.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Alasan Pembatalan</Label>
              <Textarea
                id="reason"
                placeholder="Contoh: Salah nominasi pembayaran, atau barang dikembalikan."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="col-span-3 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitCancellation}
              disabled={
                !cancelReason.trim() ||
                (cancelType === 'SETTLEMENT' ? requestCancelMutation.isPending : requestCancelSaleMutation.isPending)
              }
            >
              {(cancelType === 'SETTLEMENT' ? requestCancelMutation.isPending : requestCancelSaleMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Pengajuan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
