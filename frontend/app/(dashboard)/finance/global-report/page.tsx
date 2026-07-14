'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFinancialSummary } from '@/lib/hooks/useFinancial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  Download,
  Upload,
  BarChart3,
  Wallet,
  Activity,
  History as HistoryIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { SetInitialBalanceModal } from '@/components/SetInitialBalanceModal';
import { OmsetBreakdownModal } from '@/components/OmsetBreakdownModal';
import { ImportSettlementsModal } from '@/components/ImportSettlementsModal';
import { HistoricalSettlementModal } from '@/components/HistoricalSettlementModal';

type DisplayType = 'carry_forward' | 'sale_settled' | 'sale_pending' | 'settlement' | 'settlement_fee' | 'historical_settlement' | 'other_income' | 'cancelled';

interface DisplayRow {
  no: number;
  date: Date;
  invoiceNumber: string | null;
  description: string;
  saleDate: Date | null;
  debit: number;
  kredit: number;
  netAmount: number;
  platformFee: number;
  balance: number | null;
  displayType: DisplayType;
  group: number;
}

interface Transaction {
  type: string;
  date: string;
  invoiceNumber?: string;
  description: string;
  saleDate?: string;
  debit: number;
  credit: number;
  netAmount?: number;
  platformFee?: number;
  group?: number;
}

interface FinancialData {
  data?: {
    transactions?: Transaction[];
    summary?: FinancialSummary;
  };
}

interface FinancialSummary {
  saldoAwalPiutang?: number;
  omsetKeseluruhan?: number;
  netOmset?: number;
  totalPelunasanNet?: number;
  totalGrossSettled?: number;
  sisaPiutangAkhir?: number;
  saldoAkhirAR?: number;
  totalSelisih?: number;
  danaBersih?: number;
  piutang?: number;
}


export default function GlobalReportPage() {
  const today = new Date();
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const firstDay = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [isOmsetModalOpen, setIsOmsetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);

  const { user } = useAuth();

  const { data: financialData, isLoading } = useFinancialSummary(
    startDate && endDate ? { startDate, endDate } : undefined,
    { enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'DEV' }
  );

  const transactions: Transaction[] = (financialData as FinancialData)?.data?.transactions || [];
  const summary: FinancialSummary = (financialData as FinancialData)?.data?.summary || {};

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // AR Ledger model: tiap sale = DEBIT row, tiap settlement = KREDIT row
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    let counter = 1;
    let runningBalance = 0;

    transactions.forEach((txn: Transaction) => {
      const grp: number = txn.group ?? 2;
      const saleDateParsed = txn.saleDate ? new Date(txn.saleDate) : null;
      if (txn.type === 'carry_forward') {
        runningBalance += txn.debit;
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: null,
          debit: txn.debit,
          kredit: 0,
          netAmount: 0,
          platformFee: 0,
          balance: runningBalance,
          displayType: 'carry_forward',
          group: 0,
        });
      } else if (txn.type === 'sale_settled' || txn.type === 'sale_pending') {
        runningBalance += txn.debit;
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: null,
          debit: txn.debit,
          kredit: 0,
          netAmount: 0,
          platformFee: 0,
          balance: runningBalance,
          displayType: txn.type === 'sale_settled' ? 'sale_settled' : 'sale_pending',
          group: grp,
        });
      } else if (txn.type === 'settlement') {
        runningBalance -= txn.credit;
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: saleDateParsed,
          debit: 0,
          kredit: txn.credit,
          netAmount: txn.netAmount || 0,
          platformFee: txn.platformFee || 0,
          balance: runningBalance,
          displayType: 'settlement',
          group: grp,
        });
      } else if (txn.type === 'settlement_fee') {
        runningBalance -= txn.credit;
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: saleDateParsed,
          debit: 0,
          kredit: txn.credit,
          netAmount: 0,
          platformFee: txn.platformFee || 0,
          balance: runningBalance,
          displayType: 'settlement_fee',
          group: grp,
        });
      } else if (txn.type === 'historical_settlement') {
        runningBalance -= txn.credit;
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: null,
          description: txn.description,
          saleDate: null,
          debit: 0,
          kredit: txn.credit,
          netAmount: txn.credit,
          platformFee: 0,
          balance: runningBalance,
          displayType: 'historical_settlement',
          group: 1,
        });
      } else if (txn.type === 'other_income') {
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: null,
          debit: txn.debit,
          kredit: 0,
          netAmount: 0,
          platformFee: 0,
          balance: null,
          displayType: 'other_income',
          group: grp,
        });
      } else if (txn.type === 'cancelled') {
        rows.push({
          no: counter++,
          date: new Date(txn.date),
          invoiceNumber: txn.invoiceNumber || null,
          description: txn.description,
          saleDate: null,
          debit: 0,
          kredit: 0,
          netAmount: 0,
          platformFee: 0,
          balance: null,
          displayType: 'cancelled',
          group: grp,
        });
      }
    });

    return rows;
  }, [transactions]);

  const settledCount = displayRows.filter((r) => r.displayType === 'settlement').length;
  const piutangCount = displayRows.filter((r) => r.displayType === 'sale_pending').length;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const formatIDR = (val: number | null) => {
      if (val === null || val === undefined) return '-';
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(val);
    };
    const printed = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const typeLabel: Record<DisplayType, string> = {
      carry_forward: 'Saldo Awal',
      sale_settled: 'Penjualan (Settled)',
      sale_pending: 'Piutang (Menunggu)',
      settlement: 'Pelunasan (Net)',
      settlement_fee: 'Biaya Platform',
      historical_settlement: 'Pelunasan Piutang Historis',
      other_income: 'Pendapatan Lain',
      cancelled: 'Dibatalkan',
    };

    const aoa: (string | number)[][] = [
      ['LUNAREA FURNITURE'],
      ['Laporan Transaksi Keuangan'],
      [`Periode: ${startDate} s/d ${endDate}`],
      [`Dicetak: ${printed}`],
      [],
      ['No', 'Tanggal', 'Tipe', 'Keterangan', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo', 'No Invoice'],
    ];

    displayRows.forEach((row) => {
      aoa.push([
        row.no,
        new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        typeLabel[row.displayType],
        row.description,
        row.debit > 0 ? formatIDR(row.debit) : '-',
        row.kredit > 0 ? formatIDR(row.kredit) : '-',
        row.balance !== null ? formatIDR(row.balance) : '-',
        row.invoiceNumber
          ? row.invoiceNumber.split('-CANCELLED')[0].split('-REJECTED')[0]
          : '-',
      ]);
    });

    aoa.push([], ['RINGKASAN PIUTANG (AR LEDGER)']);
    aoa.push(['Saldo Awal Piutang', '', '', '', '', '', formatIDR(summary.saldoAwalPiutang || 0)]);
    aoa.push(['+ Penjualan Baru (Omset)', '', '', '', '', '', formatIDR(summary.omsetKeseluruhan || 0)]);
    aoa.push(['- Pelunasan Diterima (Gross)', '', '', '', '', '', `(${formatIDR(summary.totalGrossSettled || 0)})`]);
    aoa.push(['= Sisa Piutang Akhir', '', '', '', '', '', formatIDR(summary.sisaPiutangAkhir || 0)]);
    aoa.push([]);
    aoa.push(['RINCIAN SETTLED']);
    aoa.push(['Pendapatan Kotor (Settled)', '', '', '', '', '', formatIDR(summary.totalGrossSettled || 0)]);
    aoa.push(['Beban Platform', '', '', '', '', '', `(${formatIDR(summary.totalSelisih || 0)})`]);
    aoa.push(['Dana Bersih Diterima', '', '', '', '', '', formatIDR(summary.danaBersih || 0)]);
    aoa.push(['Piutang Baru (Belum Dilunasi)', '', '', '', '', '', formatIDR(summary.piutang || 0)]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 }, { wch: 16 }, { wch: 20 }, { wch: 42 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Detail Transaksi');
    XLSX.writeFile(wb, `Laporan_Transaksi_${startDate}_${endDate}.xlsx`);
  };

  const handleReset = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== 'DEV') {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">Akses Ditolak</h3>
          <p className="text-gray-600">Hanya Admin dan Super Admin yang dapat mengakses Laporan Global.</p>
          <Button onClick={() => window.history.back()}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[{ label: 'Keuangan', href: '/financial-summary' }, { label: 'Laporan Global' }]}
        />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Laporan Transaksi Global</h1>
            <p className="text-muted-foreground mt-1">Detail seluruh transaksi keuangan</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-36 h-9 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  className="w-36 h-9 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'DEV') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInitialBalanceModalOpen(true)}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Calendar className="h-4 w-4 mr-1" /> Set Saldo Awal
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'DEV') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHistoricalModalOpen(true)}
                    className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  >
                    <HistoryIcon className="h-4 w-4 mr-1" /> Lunasi Piutang Historis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                  >
                    <Upload className="h-4 w-4 mr-1" /> Import Settlement
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOmsetModalOpen(true)}
                className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              >
                <BarChart3 className="h-4 w-4 mr-1" /> Lihat Omset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={displayRows.length === 0}
              >
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SetInitialBalanceModal
        isOpen={isInitialBalanceModalOpen}
        onClose={() => setIsInitialBalanceModalOpen(false)}
      />
      <OmsetBreakdownModal
        isOpen={isOmsetModalOpen}
        onClose={() => setIsOmsetModalOpen(false)}
      />
      <ImportSettlementsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      <HistoricalSettlementModal
        isOpen={isHistoricalModalOpen}
        onClose={() => setIsHistoricalModalOpen(false)}
      />

      {/* ─── REKAP PIUTANG ─── */}
      <Card className="border-2 border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Rekap Piutang Periode Ini
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cara Baca: <strong>Piutang Bulan Lalu</strong> + <strong>Penjualan Baru</strong> (dikurangi biaya) - <strong>Uang yang Sudah Cair</strong> = <strong>Piutang Bulan Depan</strong>
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
            <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Piutang Bulan Lalu</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.saldoAwalPiutang || 0)}</p>
              <p className="text-[10px] text-muted-foreground">belum cair dari sebelumnya</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">+ Penjualan Baru</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(summary.netOmset || 0)}</p>
              <p className="text-[10px] text-muted-foreground">penjualan − biaya platform</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
              <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide">− Uang Sudah Cair</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalPelunasanNet || 0)}</p>
              <p className="text-[10px] text-muted-foreground">uang yang sudah masuk rekening</p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">=</span>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 text-center border-2 border-purple-500/30">
              <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide">Piutang Bulan Depan</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(summary.saldoAkhirAR || 0)}</p>
              <p className="text-[10px] text-muted-foreground">dibawa ke periode berikutnya</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Penjualan Baru</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(summary.omsetKeseluruhan || 0)}</p>
                <p className="text-[10px] text-muted-foreground">total order masuk periode ini</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Uang Sudah Cair</p>
                <p className="text-lg font-bold text-blue-500">{formatCurrency(summary.totalPelunasanNet || 0)}</p>
                <p className="text-[10px] text-muted-foreground">dana bersih masuk rekening</p>
              </div>
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Potongan Platform</p>
                <p className="text-lg font-bold text-orange-500">{formatCurrency(summary.totalSelisih || 0)}</p>
                <p className="text-[10px] text-muted-foreground">biaya Shopee / TikTok dll</p>
              </div>
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Belum Cair</p>
                <p className="text-lg font-bold text-amber-500">{formatCurrency(summary.sisaPiutangAkhir || 0)}</p>
                <p className="text-[10px] text-muted-foreground">masih menunggu dari platform</p>
              </div>
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend / Panduan Membaca */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Panduan Membaca Tabel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-blue-700 dark:text-blue-300">Piutang Bertambah (Kolom Hijau)</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• <strong>Angka Positif:</strong> Ada penjualan baru → piutang naik</li>
                <li>• Contoh: Penjualan Rp 500.000 → piutang bertambah Rp 500.000</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-red-700 dark:text-red-300">Uang Masuk Rekening (Kolom Merah)</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• <strong>Pelunasan:</strong> Uang masuk rekening → piutang berkurang</li>
                <li>• <strong>Biaya Platform (oranye):</strong> Potongan Shopee/TikTok → piutang berkurang</li>
                <li>• Contoh: Pelunasan Rp 382.150 + Biaya Rp 117.850 = Total piutang berkurang Rp 500.000</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-purple-700 dark:text-purple-300">Sisa Piutang (Kolom Ungu)</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Total uang yang <strong>belum cair</strong> dari marketplace</li>
                <li>• Tanda &quot;n/a&quot; = tidak mempengaruhi piutang (pendapatan lain)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi Keuangan</CardTitle>
          <p className="text-sm text-muted-foreground">
            {settledCount} transaksi settled
            {piutangCount > 0 && ` · ${piutangCount} menunggu pelunasan`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">Piutang Bertambah</span>
                      <span className="text-xs text-muted-foreground font-normal">(Debit)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">Uang Masuk Rekening</span>
                      <span className="text-xs text-muted-foreground font-normal">(Kredit)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">Sisa Piutang</span>
                      <span className="text-xs text-muted-foreground font-normal">(Belum Cair)</span>
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-muted-foreground mt-2">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">
                      Tidak ada data transaksi untuk periode ini
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row, idx) => {
                    const prevRow = idx > 0 ? displayRows[idx - 1] : null;
                    const isGroupChange = prevRow !== null && prevRow.group !== row.group;
                    const sectionLabel =
                      row.group === 1
                        ? 'PELUNASAN DARI BULAN LALU (Mengurangi Saldo Awal Piutang)'
                        : row.group === 2 && isGroupChange
                        ? 'TRANSAKSI BULAN INI (Penjualan & Pelunasan Baru)'
                        : null;
                    return (
                      <React.Fragment key={`frag_${row.no}`}>
                        {isGroupChange && sectionLabel && (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className={
                                row.group === 1
                                  ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-sm font-bold py-2 px-4 border-y-2 border-orange-300 dark:border-orange-700'
                                  : 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold py-2 px-4 border-y-2 border-indigo-300 dark:border-indigo-700'
                              }
                            >
                              {sectionLabel}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow
                          className={
                            row.displayType === 'carry_forward'
                              ? 'bg-blue-50/60 dark:bg-blue-950/20 font-semibold'
                              : row.group === 1
                              ? 'bg-orange-50/50 dark:bg-orange-950/10'
                              : row.displayType === 'sale_pending'
                              ? 'bg-amber-50/40 dark:bg-amber-950/10'
                              : row.displayType === 'cancelled'
                              ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/20'
                              : row.displayType === 'other_income'
                              ? 'bg-blue-50/20 dark:bg-blue-950/10'
                              : ''
                          }
                        >
                          <TableCell className="text-center text-sm font-medium">{row.no}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell
                            className="max-w-xs text-sm"
                            style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          >
                            {row.displayType === 'cancelled' ? (
                              <span className="line-through text-muted-foreground">{row.description}</span>
                            ) : (
                              <span>
                                {row.description}
                                {(row.displayType === 'settlement' || row.displayType === 'settlement_fee') && row.saleDate && (
                                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                                    Pelunasan dari penjualan tgl {new Date(row.saleDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {row.debit > 0 ? (
                              <span className={row.displayType === 'carry_forward' ? 'text-blue-600' : 'text-green-600'}>
                                {formatCurrency(row.debit)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {row.kredit > 0 ? (
                              row.displayType === 'settlement_fee' ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-orange-500 font-bold">{formatCurrency(row.kredit)}</span>
                                  <span className="text-[10px] text-orange-600 italic">biaya platform</span>
                                </div>
                              ) : (
                                <span className="text-red-500">{formatCurrency(row.kredit)}</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            {row.balance !== null ? (
                              <span className="text-purple-600">{formatCurrency(row.balance)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic" title="Tidak mempengaruhi saldo piutang">
                                n/a
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.displayType === 'carry_forward' ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                                Saldo Awal
                              </Badge>
                            ) : row.displayType === 'sale_settled' ? (
                              <Badge variant="outline" className="text-green-700 border-green-400 text-xs">
                                Penjualan
                              </Badge>
                            ) : row.displayType === 'sale_pending' ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs" title="Menunggu pelunasan dari marketplace">
                                Belum Cair
                              </Badge>
                            ) : row.displayType === 'settlement' ? (
                              <Badge variant="outline" className="text-green-600 border-green-300 text-xs" title="Uang sudah masuk rekening">
                                Uang Masuk
                              </Badge>
                            ) : row.displayType === 'settlement_fee' ? (
                              <Badge variant="outline" className="text-orange-500 border-orange-300 text-xs" title="Potongan dari marketplace (Shopee, Tokopedia, dll)">
                                Potongan
                              </Badge>
                            ) : row.displayType === 'historical_settlement' ? (
                              <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs" title="Pelunasan piutang dari periode sebelum sistem digunakan">
                                Piutang Lama
                              </Badge>
                            ) : row.displayType === 'other_income' ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs" title="Pendapatan di luar penjualan (tidak mempengaruhi piutang)">
                                Pendapatan Lain
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-gray-300 text-xs">
                                Dibatalkan
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[130px] truncate">
                            {row.invoiceNumber
                              ? row.invoiceNumber.split('-CANCELLED')[0].split('-REJECTED')[0]
                              : '-'}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
              {displayRows.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/60 border-t-2 border-border font-bold">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right text-muted-foreground">
                      TOTAL PERIODE INI
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 dark:text-green-400 text-sm">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(summary.netOmset || 0)}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">penjualan - biaya</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 text-sm">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(summary.totalPelunasanNet || 0)}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">uang masuk rekening</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700 dark:text-purple-400 text-sm">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(summary.saldoAkhirAR || 0)}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">sisa belum cair</span>
                      </div>
                    </td>
                    <td colSpan={2} className="px-4 py-3" />
                  </tr>
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-indigo-200/50">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="font-semibold text-indigo-600">Ringkasan:</span>
                        <span className="text-blue-600">Piutang Bulan Lalu {formatCurrency(summary.saldoAwalPiutang || 0)}</span>
                        <span className="text-green-600">+ Penjualan Baru {formatCurrency(summary.netOmset || 0)}</span>
                        <span className="text-red-600">− Uang Sudah Cair {formatCurrency(summary.totalPelunasanNet || 0)}</span>
                        <span className="font-bold text-purple-600">= Piutang Bulan Depan {formatCurrency(summary.saldoAkhirAR || 0)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
