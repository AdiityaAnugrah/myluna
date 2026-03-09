'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFinancialSummary } from '@/lib/hooks/useFinancial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  Download,
  X,
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

  const { user } = useAuth();

  const { data: financialData, isLoading } = useFinancialSummary(
    startDate && endDate ? { startDate, endDate } : undefined,
    { enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' }
  );

  const transactions = (financialData as any)?.data?.transactions || [];
  const summary = (financialData as any)?.data?.summary || {};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const formatIDR = (val: number | null) => {
      if (val === null || val === undefined || val === 0) return '-';
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    const typeLabel = (type: string) => {
      switch (type) {
        case 'income': return 'Pendapatan';
        case 'other_income': return 'Pendapatan Lain';
        case 'expense': return 'Pengeluaran';
        case 'tipe_pelunasan': return 'Tipe Pelunasan';
        case 'piutang': return 'Piutang';
        case 'cancelled': return 'Dibatalkan';
        case 'carry_forward': return 'Saldo Awal';
        default: return type;
      }
    };

    const aoa: any[][] = [
      // Company header
      ['LUNAREA FURNITURE'],
      ['Laporan Transaksi Keuangan'],
      [`Periode: ${startDate} s/d ${endDate}`],
      [`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`],
      [],
      // Column headers
      ['No', 'Tanggal', 'Tipe', 'Keterangan', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo', 'No Invoice'],
    ];

    transactions.forEach((item: any) => {
      const dateStr = new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const debit = item.debit && item.debit !== 0 ? item.debit : null;
      const credit = item.credit && item.credit !== 0 ? item.credit : null;
      aoa.push([
        item.no,
        dateStr,
        typeLabel(item.type),
        item.description,
        debit ? formatIDR(debit) : '-',
        credit ? formatIDR(credit) : '-',
        item.balance !== null && item.balance !== undefined ? formatIDR(item.balance) : '-',
        item.invoiceNumber || '-',
      ]);
    });

    // Spacer + summary
    aoa.push([]);
    aoa.push(['', '', '', 'TOTAL', formatIDR(summary.totalIncome || 0), formatIDR(summary.totalExpense || 0), formatIDR(summary.finalBalance || 0), '']);
    aoa.push([]);
    aoa.push(['RINGKASAN PERIODE']);
    aoa.push(['Total Pendapatan (Penjualan + Lain-lain)', '', '', '', formatIDR(summary.totalIncome || 0)]);
    aoa.push(['Total Beban Platform', '', '', '', formatIDR(summary.totalSelisih || 0)]);
    aoa.push(['Dana Bersih Diterima', '', '', '', formatIDR(summary.danaBersih || 0)]);
    aoa.push(['Piutang Periode Ini', '', '', '', formatIDR(summary.piutang || 0)]);
    if (summary.carryForwardPiutang > 0) {
      aoa.push(['Piutang Bulan Lalu', '', '', '', formatIDR(summary.carryForwardPiutang || 0)]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 16 },  // Tanggal
      { wch: 16 },  // Tipe
      { wch: 42 },  // Keterangan
      { wch: 20 },  // Debit
      { wch: 20 },  // Kredit
      { wch: 20 },  // Saldo
      { wch: 22 },  // Invoice
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Detail Transaksi');

    XLSX.writeFile(wb, `Laporan_Transaksi_${startDate}_${endDate}.xlsx`);
  };

  const handleReset = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
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
              <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={transactions.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Piutang Bulan Lalu</p>
                <p className="text-lg font-bold text-blue-500">{formatCurrency(summary.carryForwardPiutang || 0)}</p>
                <p className="text-[10px] text-muted-foreground">dari Bulan Lalu</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendapatan Bulan Ini</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(summary.totalIncome || 0)}</p>
                <p className="text-[10px] text-muted-foreground">settled bulan ini</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Piutang Bulan Ini</p>
                <p className="text-lg font-bold text-amber-500">{formatCurrency(summary.piutang || 0)}</p>
                <p className="text-[10px] text-muted-foreground">dari Bulan Ini</p>
              </div>
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sisa Piutang</p>
                <p className="text-lg font-bold text-purple-500">{formatCurrency(summary.sisaPiutangAkhir || 0)}</p>
                <p className="text-[10px] text-muted-foreground">terbawa ke Bulan depan</p>
              </div>
              <TrendingDown className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Transaksi Keuangan */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi Keuangan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total {summary.transactionCount || 0} transaksi (Pendapatan + Selisih)
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Debit (Masuk)</TableHead>
                  <TableHead className="text-right">Kredit (Keluar)</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>No Invoice</TableHead>
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
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada data transaksi untuk periode ini
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((item: any) => (
                    <TableRow key={item.no} className={
                      item.type === 'carry_forward' ? 'bg-blue-50/50 dark:bg-blue-950/20 font-semibold' :
                      item.type === 'piutang' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                      item.type === 'expense' ? 'bg-red-50/30 dark:bg-red-950/10' :
                      item.type === 'tipe_pelunasan' ? 'bg-purple-50/30 dark:bg-purple-950/10' :
                      item.type === 'other_income' ? 'bg-blue-50/30 dark:bg-blue-950/10' :
                      item.type === 'platform_fee' ? 'bg-purple-50/20 dark:bg-purple-950/10' :
                      item.type === 'cancelled' ? 'bg-gray-50/50 dark:bg-gray-900/20 opacity-60' :
                      'bg-green-50/30 dark:bg-green-950/10'
                    }>
                      <TableCell className="font-medium text-center">{item.no}</TableCell>
                      <TableCell>
                        {new Date(item.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {item.type === 'carry_forward' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Saldo Awal
                          </span>
                        ) : item.type === 'income' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Pendapatan
                          </span>
                        ) : item.type === 'other_income' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Lain-lain
                          </span>
                        ) : item.type === 'platform_fee' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            <TrendingDown className="mr-1 h-3 w-3" />
                            Beban Platform
                          </span>
                        ) : item.type === 'tipe_pelunasan' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Tipe Pelunasan
                          </span>
                        ) : item.type === 'piutang' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <Calendar className="mr-1 h-3 w-3" />
                            Menunggu
                          </span>
                        ) : item.type === 'cancelled' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through">
                            <X className="mr-1 h-3 w-3" />
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <TrendingDown className="mr-1 h-3 w-3" />
                            Pengeluaran
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="max-w-xs"
                        style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        {item.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          item.type === 'piutang' ? 'text-amber-600' :
                          item.type === 'other_income' ? 'text-blue-600' :
                          item.type === 'tipe_pelunasan' ? 'text-purple-600' :
                          item.type === 'cancelled' ? 'text-red-500 line-through opacity-70' :
                          'text-green-600'
                        }`}
                      >
                        {item.debit !== 0 ? formatCurrency(item.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {item.credit !== 0 ? formatCurrency(item.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {item.balance !== null ? formatCurrency(item.balance) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.invoiceNumber || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/60 border-t-2 border-border font-bold">
                    <td colSpan={4} className="px-4 py-3 text-sm text-right">TOTAL</td>
                    <td className="px-4 py-3 text-right text-green-700 dark:text-green-400 text-sm">
                      {formatCurrency(transactions.filter((t: any) => t.debit > 0).reduce((s: number, t: any) => s + t.debit, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 text-sm">
                      {formatCurrency(transactions.filter((t: any) => t.credit > 0).reduce((s: number, t: any) => s + t.credit, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700 dark:text-purple-400 text-sm">
                      {formatCurrency(summary.finalBalance || 0)}
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
