'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFinancialSummary } from '@/lib/hooks/useFinancial';
import { useSales } from '@/lib/hooks/useSales';
import { usePlatforms } from '@/lib/hooks/usePlatforms';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';

export default function FinancialSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const today = new Date();
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const firstDay = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const { data, isLoading: summaryLoading, refetch } = useFinancialSummary(
    startDate && endDate ? { startDate, endDate } : undefined,
    { enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' }
  );

  const { data: salesData, isLoading: salesLoading } = useSales({
    limit: 5000,
    startDate,
    endDate,
  });
  const { data: platformsData, isLoading: platformsLoading } = usePlatforms();

  const isLoading = summaryLoading || salesLoading || platformsLoading;

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">Akses Ditolak</h3>
          <p className="text-gray-600">Hanya Admin dan Super Admin yang dapat mengakses Ringkasan Keuangan.</p>
          <Button onClick={() => router.push('/')}>Kembali ke Dashboard</Button>
        </div>
      </div>
    );
  }

  const summary = (data as any)?.data?.summary || {};
  const sales = useMemo(() => salesData?.data?.sales || [], [salesData]);

  // Platform breakdown
  const platformStats = useMemo(() => {
    const statsMap: Record<string, { revenue: number; count: number }> = {};
    sales.forEach((sale: any) => {
      const p = sale.platform;
      if (!statsMap[p]) statsMap[p] = { revenue: 0, count: 0 };
      statsMap[p].revenue += parseFloat(sale.totalAmount);
      statsMap[p].count += 1;
    });
    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name: name.replace('_', ' '),
        value: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  const totalRevenue = useMemo(() => platformStats.reduce((sum, p) => sum + p.value, 0), [platformStats]);

  // Chart data (group by date)
  const chartData = useMemo(() => {
    const dataMap: Record<string, { date: string; revenue: number }> = {};
    sales.forEach((s: any) => {
      const date = s.saleDate.split('T')[0];
      if (!dataMap[date]) dataMap[date] = { date, revenue: 0 };
      dataMap[date].revenue += parseFloat(s.totalAmount);
    });
    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['oklch(0.6 0.12 260)', 'oklch(0.6 0.25 150)', 'oklch(0.7 0.15 80)', 'oklch(0.5 0.2 25)', 'oklch(0.6 0.15 300)', 'oklch(0.6 0.2 330)'];

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const formatIDR = (val: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

    const printed = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Sheet 1: Ringkasan ──────────────────────────────────────────────────
    const summaryAoa: any[][] = [
      ['LUNAREA FURNITURE'],
      ['Ringkasan Keuangan'],
      [`Periode: ${startDate} s/d ${endDate}`],
      [`Dicetak: ${printed}`],
      [],
      ['ITEM', 'NILAI'],
      ['Total Pendapatan (Penjualan + Lain-lain)', formatIDR(summary.totalIncome || 0)],
      ['Total Beban Platform (Selisih)', formatIDR(summary.totalSelisih || 0)],
      ['Dana Bersih Diterima', formatIDR(summary.danaBersih || 0)],
      ['Piutang Periode Ini (Belum Dilunasi)', formatIDR(summary.piutang || 0)],
    ];
    if ((summary.carryForwardPiutang || 0) > 0) {
      summaryAoa.push(['Sisa Piutang Terbawa (Bulan Lalu)', formatIDR(summary.carryForwardPiutang || 0)]);
    }
    summaryAoa.push(['Saldo Akhir', formatIDR(summary.finalBalance || 0)]);

    const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);
    ws1['!cols'] = [{ wch: 42 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

    // ── Sheet 2: Per Platform ───────────────────────────────────────────────
    const platformAoa: any[][] = [
      ['LUNAREA FURNITURE'],
      ['Kontribusi Penjualan Per Platform'],
      [`Periode: ${startDate} s/d ${endDate}`],
      [`Dicetak: ${printed}`],
      [],
      ['Platform', 'Jumlah Transaksi', 'Total Pendapatan (IDR)', 'Rata-rata / Transaksi', 'Kontribusi (%)'],
      ...platformStats.map((p) => [
        p.name,
        p.count,
        formatIDR(p.value),
        formatIDR(p.count > 0 ? Math.round(p.value / p.count) : 0),
        totalRevenue > 0 ? `${Math.round((p.value / totalRevenue) * 100)}%` : '0%',
      ]),
      [],
      ['TOTAL', platformStats.reduce((s, p) => s + p.count, 0), formatIDR(totalRevenue), '', '100%'],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(platformAoa);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Per Platform');

    XLSX.writeFile(wb, `Ringkasan_Keuangan_${startDate}_${endDate}.xlsx`);
  };

  const handleReset = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Ringkasan Keuangan', href: '/financial-summary' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Ringkasan Keuangan</h1>
          <p className="text-muted-foreground mt-1">Ringkasan saldo, tren, dan kontribusi per platform</p>
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
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalIncome || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Penjualan settle + pendapatan lain-lain</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Kredit (Keluar)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpense || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Beban platform + pencatatan lain-lain</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dana Bersih</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-blue-500">{formatCurrency(summary.danaBersih || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Net settlement + pendapatan lain-lain</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Piutang</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-purple-500">{formatCurrency(summary.sisaPiutangAkhir || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total penjualan yang belum dilunasi</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Pendapatan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Tren Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                  Tidak ada data untuk ditampilkan
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis tickFormatter={(val) => `Rp ${val / 1000000}jt`} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kontribusi Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              Kontribusi Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : platformStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                  Belum ada data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {platformStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {platformStats.map((platform, index) => (
                <div key={platform.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-muted-foreground">{platform.name}</span>
                  </div>
                  <span className="font-semibold">{totalRevenue > 0 ? Math.round((platform.value / totalRevenue) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rangkuman Per Platform */}
      <Card>
        <CardHeader>
          <CardTitle>Rangkuman Per Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Jumlah Transaksi</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
                <TableHead className="text-right">Rata-rata/Sales</TableHead>
                <TableHead className="text-right">Kontribusi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : platformStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                    Belum ada data transaksi untuk periode ini
                  </TableCell>
                </TableRow>
              ) : (
                platformStats.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.count}</TableCell>
                    <TableCell className="text-right text-green-500 font-semibold">{formatCurrency(p.value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.value / p.count)}</TableCell>
                    <TableCell className="text-right">
                      {totalRevenue > 0 ? Math.round((p.value / totalRevenue) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
