'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpenCheck,
  Calendar,
  Landmark,
  Loader2,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { useFinancialSummary } from '@/lib/hooks/useFinancial';
import { cn } from '@/lib/utils';

type BookMode = 'sales' | 'cost';

type Transaction = {
  type: string;
  date: string;
  invoiceNumber?: string | null;
  description: string;
  saleDate?: string | null;
  debit: number;
  credit: number;
  netAmount?: number;
  platformFee?: number;
  platformFeePercentage?: number;
  platform?: string | null;
  group?: number;
};

type BookRow = {
  no: number;
  date: Date;
  invoiceNumber: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  type: 'opening' | 'sale' | 'settlement' | 'historical' | 'other' | 'cancelled';
  statusLabel: string;
};

const DEFAULT_COST_RATE = 25;

const formatDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (value: Date) =>
  value.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const isSaleTransaction = (txn: Transaction) => txn.type === 'sale_settled' || txn.type === 'sale_pending';

const isBookTransaction = (txn: Transaction) => isSaleTransaction(txn) || txn.type === 'settlement';

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

function getStatusTone(type: BookRow['type']) {
  if (type === 'sale') return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300';
  if (type === 'settlement') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300';
  if (type === 'historical') return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300';
  if (type === 'cancelled') return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300';
}

function buildRows(
  transactions: Transaction[],
  mode: BookMode,
  openingBalance = 0,
  openingMonthKey: string | null = null
): BookRow[] {
  const rows: BookRow[] = [];
  let runningBalance = openingBalance;
  let counter = 1;
  let activeMonthKey: string | null = openingMonthKey;

  for (const txn of transactions.filter(isBookTransaction)) {
    const date = new Date(txn.date);
    const monthKey = getMonthKey(date);
    const invoiceNumber = txn.invoiceNumber || null;
    const baseDescription = txn.description || '-';
    const description = txn.platform ? `${baseDescription} (${txn.platform})` : baseDescription;

    if (activeMonthKey !== monthKey) {
      activeMonthKey = monthKey;
      runningBalance = 0;
    }

    const gross = Number(txn.debit || 0);
    const feePercentage = Number(txn.platformFeePercentage ?? DEFAULT_COST_RATE);

    if (isSaleTransaction(txn)) {
      const estimatedFee = gross * (feePercentage / 100);
      runningBalance += gross;
      rows.push({
        no: counter++,
        date,
        invoiceNumber,
        description,
        debit: mode === 'sales' ? gross : null,
        credit: mode === 'cost' ? estimatedFee : null,
        balance: runningBalance,
        type: 'sale',
        statusLabel: mode === 'sales'
          ? txn.type === 'sale_pending' ? 'Penjualan / Piutang' : 'Penjualan'
          : `Biaya Penjualan ${feePercentage.toLocaleString('id-ID')}%`,
      });
      continue;
    }

    if (txn.type === 'settlement') {
      const actualNetAmount = Number(txn.netAmount ?? txn.credit ?? 0);
      const platformFee = Number(txn.platformFee || 0);
      const grossSettlement = actualNetAmount + platformFee;
      const expectedPlatformFee = grossSettlement * (feePercentage / 100);
      const expectedNetAmount = grossSettlement - expectedPlatformFee;
      const adjustmentCredit = expectedNetAmount - actualNetAmount;

      runningBalance -= grossSettlement;
      rows.push({
        no: counter++,
        date,
        invoiceNumber,
        description,
        debit: mode === 'cost' ? actualNetAmount : null,
        credit: mode === 'sales' ? grossSettlement : adjustmentCredit,
        balance: runningBalance,
        type: 'settlement',
        statusLabel: mode === 'sales' ? 'Pelunasan' : 'Dana Bersih',
      });
    }
  }

  return rows;
}

export function FinanceBookPage({ mode }: { mode: BookMode }) {
  const router = useRouter();
  const { user } = useAuth();
  const today = new Date();
  const firstDay = formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = formatDateInput(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'DEV';
  const featureKey = mode === 'sales' ? 'finance-sales-book' : 'finance-cost-book';
  const { data: featuresResponse, isLoading: isLoadingFeatures } = useFeatures({ enabled: isAllowed });
  const features = featuresResponse?.data || [];
  const featureControlReady = features.length > 0;
  const feature = features.find((item: any) => item.key === featureKey);
  const isFeatureAvailable = user?.role === 'DEV' || !featureControlReady || !!feature;
  const { data, isLoading } = useFinancialSummary(
    startDate && endDate ? { startDate, endDate, page, limit, bookMode: mode } : undefined,
    { enabled: isAllowed && isFeatureAvailable }
  );

  const transactions: Transaction[] = (data as any)?.data?.transactions || [];
  const pagination = (data as any)?.data?.pagination || {
    total: 0,
    page,
    limit,
    totalPages: 1,
  };
  const rows = useMemo(
    () => buildRows(
      transactions,
      mode,
      Number(pagination.openingBalance || 0),
      pagination.openingMonthKey || null
    ),
    [transactions, mode, pagination.openingBalance, pagination.openingMonthKey]
  );

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, mode, limit]);

  const pageTitle = mode === 'sales' ? 'Buku Penjualan' : 'Buku Biaya';
  const pageDescription =
    mode === 'sales'
      ? 'Pantau debit penjualan dan saldo penjualan berjalan per bulan.'
      : 'Pantau kredit biaya platform dari tiap penjualan dengan saldo penjualan berjalan per bulan.';
  const Icon = mode === 'sales' ? BookOpenCheck : ReceiptText;

  const totalDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const totalSalesBasis = transactions
    .filter(isSaleTransaction)
    .reduce((sum, txn) => sum + Number(txn.debit || 0), 0);
  const finalBalance = rows.at(-1)?.balance ?? 0;

  if (!isAllowed) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Hanya Admin dan Super Admin yang dapat mengakses {pageTitle}.</p>
            <Button onClick={() => router.push('/')}>Kembali ke Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingFeatures && isAllowed) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memeriksa akses fitur...
      </div>
    );
  }

  if (!isFeatureAvailable) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Keuangan' }, { label: pageTitle }]} />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{pageTitle} belum aktif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fitur preview ini dikunci dulu supaya data produksi tetap dipakai dari laporan lama sampai hasil validasi disetujui.
            </p>
            <Button onClick={() => router.push('/financial-summary')}>Kembali ke Ringkasan Keuangan</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Keuangan' }, { label: pageTitle }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">{pageDescription}</p>
            </div>
          </div>
        </div>

        <Card className="border-border/60">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs">Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tanggal Akhir</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <BookOpenCheck className="h-4 w-4" />
        <AlertTitle>Mode Preview Read-only</AlertTitle>
        <AlertDescription>
          Halaman ini hanya membaca data finance existing dan tidak mengubah data produksi. Gunakan untuk validasi angka sebelum dijadikan acuan operasional.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-9 w-9 rounded-xl bg-green-100 p-2 text-green-700 dark:bg-green-950/40 dark:text-green-300" />
            <div>
              <p className="text-xs text-muted-foreground">{mode === 'sales' ? 'Total Debit Penjualan' : 'Total Dasar Penjualan'}</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(mode === 'sales' ? totalDebit : totalSalesBasis)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingDown className="h-9 w-9 rounded-xl bg-orange-100 p-2 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" />
            <div>
              <p className="text-xs text-muted-foreground">{mode === 'sales' ? 'Total Kredit' : 'Total Kredit Biaya Platform'}</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(totalCredit)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className="h-9 w-9 rounded-xl bg-purple-100 p-2 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo Penjualan</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(finalBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-9 w-9 rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" />
            <div>
              <p className="text-xs text-muted-foreground">Periode</p>
              <p className="text-sm font-semibold">{startDate} s/d {endDate}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-2">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Kotak {pageTitle}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                D = {mode === 'sales' ? 'penjualan' : '-'} · K = {mode === 'sales' ? '-' : 'persentase platform dari penjualan'} · S = saldo penjualan bulanan
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {rows.length} baris tampil · {pagination.total} total transaksi
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat {pageTitle.toLowerCase()}...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
              <Icon className="h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">Belum ada data pada periode ini</p>
              <p className="text-sm text-muted-foreground">Coba ubah rentang tanggal di filter atas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="w-14 text-center">No</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal</TableHead>
                    <TableHead className="min-w-[150px]">Invoice</TableHead>
                    <TableHead className="min-w-[240px]">Keterangan</TableHead>
                    <TableHead className="min-w-[150px] text-right">D / Debit</TableHead>
                    <TableHead className="min-w-[150px] text-right">K / Kredit</TableHead>
                    <TableHead className="min-w-[150px] text-right">S / Saldo</TableHead>
                    <TableHead className="min-w-[150px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.no}-${row.type}-${row.invoiceNumber || row.description}`} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground">{row.no}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                      <TableCell className="font-medium">{row.invoiceNumber || '-'}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-sm" title={row.description}>{row.description}</TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', row.debit ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground')}>
                        {formatCurrency(row.debit)}
                      </TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', row.credit ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground')}>
                        {formatCurrency(row.credit)}
                      </TableCell>
                      <TableCell className={cn('text-right font-black tabular-nums', row.balance === 0 ? 'text-green-700 dark:text-green-300' : row.balance === null ? 'text-muted-foreground' : 'text-purple-700 dark:text-purple-300')}>
                        {formatCurrency(row.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', getStatusTone(row.type))}>
                          {row.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && rows.length > 0 && (
            <div className="border-t bg-muted/20 px-4">
              <Pagination
                currentPage={Number(pagination.page || page)}
                totalPages={Number(pagination.totalPages || 1)}
                totalItems={Number(pagination.total || 0)}
                itemsPerPage={Number(pagination.limit || limit)}
                onPageChange={setPage}
                onItemsPerPageChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
                pageSizeOptions={[50, 100, 200, 500]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
