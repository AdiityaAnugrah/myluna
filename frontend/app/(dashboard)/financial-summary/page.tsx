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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type PeriodPreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

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
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');

  const { data, isLoading: summaryLoading, refetch } = useFinancialSummary(
    startDate && endDate ? { startDate, endDate } : undefined,
    { enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'DEV' }
  );

  const { data: salesData, isLoading: salesLoading } = useSales({
    limit: 5000,
    startDate,
    endDate,
  });
  const { data: platformsData, isLoading: platformsLoading } = usePlatforms();

  const isLoading = summaryLoading || salesLoading || platformsLoading;

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== 'DEV') {
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

  const platformNamesByKey = useMemo(() => {
    const result = new Map<string, string>();
    for (const platform of platformsData?.data || []) {
      if (!platform.isActive) continue;
      const key = String(platform.name).trim().replace(/[\s-]+/g, '_').toUpperCase();
      result.set(key, platform.name);
    }
    return result;
  }, [platformsData]);

  const getPlatformDisplayName = (raw: string) => {
    const key = String(raw || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    const exactMasterName = platformNamesByKey.get(key);
    if (exactMasterName) return exactMasterName;

    if (key === 'OFFLINE_STORE' || key === 'TOKO_OFFLINE') {
      return platformNamesByKey.get('WEBSITE')
        || platformNamesByKey.get('TOKO_OFFLINE')
        || 'Toko Offline';
    }

    const legacyNames: Record<string, string> = {
      TOKOPEDIA: 'Tokopedia',
      SHOPEE: 'Shopee',
      TIKTOK_SHOP: 'TikTok Shop',
      LAZADA: 'Lazada',
      OTHER: 'Lainnya',
    };
    return legacyNames[key] || raw;
  };

  // Platform breakdown — exclude CANCELLED & REJECTED agar konsisten dengan omset
  // Group by current master name so legacy values do not create duplicate rows.
  const platformStats = useMemo(() => {
    const statsMap: Record<string, { revenue: number; count: number }> = {};
    sales
      .filter((sale: any) => !['CANCELLED', 'REJECTED'].includes(sale.status))
      .forEach((sale: any) => {
        const displayName = getPlatformDisplayName(sale.platform);
        if (!statsMap[displayName]) statsMap[displayName] = { revenue: 0, count: 0 };
        statsMap[displayName].revenue += parseFloat(sale.totalAmount);
        statsMap[displayName].count += 1;
      });
    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        value: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales, platformNamesByKey]);

  const totalRevenue = useMemo(() => platformStats.reduce((sum, p) => sum + p.value, 0), [platformStats]);

  // Chart data (group by date)
  const chartData = useMemo(() => {
    const dataMap: Record<string, {
      date: string;
      revenue: number;
      totalUnits: number;
      products: Record<string, { name: string; quantity: number }>;
    }> = {};

    sales
      .filter((s: any) => !['CANCELLED', 'REJECTED'].includes(s.status))
      .forEach((s: any) => {
        const date = s.saleDate.split('T')[0];
        if (!dataMap[date]) {
          dataMap[date] = { date, revenue: 0, totalUnits: 0, products: {} };
        }

        dataMap[date].revenue += parseFloat(s.totalAmount || '0');

        (s.items || []).forEach((item: any) => {
          const quantity = Number(item.quantity || 0);
          const productName = item.product?.name
            || item.productName
            || item.componentName
            || item.variantName
            || 'Produk tanpa nama';
          const productKey = String(item.productId || item.componentName || productName);

          dataMap[date].totalUnits += quantity;
          if (!dataMap[date].products[productKey]) {
            dataMap[date].products[productKey] = { name: productName, quantity: 0 };
          }
          dataMap[date].products[productKey].quantity += quantity;
        });
      });

    return Object.values(dataMap)
      .map((row) => ({
        ...row,
        productList: Object.values(row.products).sort((a, b) => b.quantity - a.quantity),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['oklch(0.6 0.12 260)', 'oklch(0.6 0.25 150)', 'oklch(0.7 0.15 80)', 'oklch(0.5 0.2 25)', 'oklch(0.6 0.15 300)', 'oklch(0.6 0.2 330)'];

  const setDateRange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const day = now.getDay() || 7; // Monday-based week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const ranges: Record<Exclude<PeriodPreset, 'custom'>, [Date, Date]> = {
      today: [now, now],
      this_week: [startOfWeek, endOfWeek],
      this_month: [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)],
      last_month: [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)],
      this_year: [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31)],
    };

    if (preset === 'custom') return;
    const [start, end] = ranges[preset];
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setPeriodPreset('custom');
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: `Laporan Keuangan Lunarea ${startDate} s/d ${endDate}`,
      Subject: 'Ringkasan Keuangan',
      Author: 'Lunarea Furniture',
      Company: 'Lunarea Furniture',
      CreatedDate: new Date(),
    };

    const transactions = (data as any)?.data?.transactions || [];
    const printed = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const moneyFormat = '"Rp" #,##0;[Red]("Rp" #,##0);-';
    const percentFormat = '0%';
    const fileSafePeriod = `${startDate}_sd_${endDate}`.replace(/[^\d_a-z-]/gi, '_');
    const addHeader = (title: string, subtitle?: string) => [
      ['LUNAREA FURNITURE'],
      [title],
      [`Periode: ${startDate} s/d ${endDate}`],
      [`Dicetak: ${printed}`],
      ...(subtitle ? [[subtitle]] : []),
      [],
    ];
    const setCurrencyFormat = (ws: XLSX.WorkSheet, cols: string[], fromRow = 1) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let row = fromRow; row <= range.e.r + 1; row += 1) {
        cols.forEach((col) => {
          const cell = ws[`${col}${row}`];
          if (cell && typeof cell.v === 'number') cell.z = moneyFormat;
        });
      }
    };
    const setPercentFormat = (ws: XLSX.WorkSheet, cols: string[], fromRow = 1) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let row = fromRow; row <= range.e.r + 1; row += 1) {
        cols.forEach((col) => {
          const cell = ws[`${col}${row}`];
          if (cell && typeof cell.v === 'number') cell.z = percentFormat;
        });
      }
    };
    const appendSheet = (name: string, aoa: any[][], widths: number[], currencyCols: string[] = [], percentCols: string[] = []) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = widths.map((wch) => ({ wch }));
      ws['!freeze'] = { xSplit: 0, ySplit: Math.min(aoa.findIndex((row) => row.includes('No')) + 1 || 1, 8) } as any;
      if (currencyCols.length) setCurrencyFormat(ws, currencyCols);
      if (percentCols.length) setPercentFormat(ws, percentCols);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    // ── Sheet 1: Ringkasan ──────────────────────────────────────────────────
    const summaryAoa: any[][] = [
      ...addHeader('Ringkasan Keuangan Resmi', 'Laporan ini mengikuti filter periode aktif di sistem.'),
      [],
      ['RINGKASAN PIUTANG (AR LEDGER)', ''],
      ['Saldo Awal Piutang', Number(summary.saldoAwalPiutang || 0)],
      ['+ Penjualan Baru (Omset)', Number(summary.omsetKeseluruhan || 0)],
      ['- Pelunasan Diterima (incl. historis)', Number(summary.totalPelunasanNet || 0)],
      ['= Sisa Piutang Akhir', Number(summary.saldoAkhirAR || summary.sisaPiutangAkhir || 0)],
      [],
      ['RINCIAN SETTLED', ''],
      ['Pendapatan Kotor (Settled)', Number(summary.totalGrossSettled || 0)],
      ['Beban Platform', Number(summary.totalSelisih || 0)],
      ['Dana Bersih Diterima', Number(summary.danaBersih || 0)],
      ['Piutang Baru (Belum Dilunasi)', Number(summary.piutang || 0)],
      ['Jumlah Baris Transaksi', Number(summary.transactionCount || transactions.length || 0)],
    ];

    appendSheet('01 Ringkasan', summaryAoa, [44, 24], ['B']);

    // ── Sheet 2: Per Platform ───────────────────────────────────────────────
    const platformAoa: any[][] = [
      ...addHeader('Kontribusi Penjualan Per Platform'),
      ['Platform', 'Jumlah Transaksi', 'Total Pendapatan (IDR)', 'Rata-rata / Transaksi', 'Kontribusi (%)'],
      ...platformStats.map((p) => [
        p.name,
        p.count,
        Number(p.value),
        Number(p.count > 0 ? Math.round(p.value / p.count) : 0),
        totalRevenue > 0 ? p.value / totalRevenue : 0,
      ]),
      [],
      ['TOTAL', platformStats.reduce((s, p) => s + p.count, 0), Number(totalRevenue), '', totalRevenue > 0 ? 1 : 0],
    ];

    appendSheet('02 Per Platform', platformAoa, [24, 18, 24, 24, 14], ['C', 'D'], ['E']);

    // ── Sheet 3: Detail Transaksi Keuangan ─────────────────────────────────
    const typeLabels: Record<string, string> = {
      carry_forward: 'Saldo Awal',
      sale_settled: 'Penjualan Settled',
      sale_pending: 'Penjualan Belum Lunas',
      settlement: 'Pelunasan Net',
      settlement_fee: 'Biaya Platform',
      historical_settlement: 'Pelunasan Historis',
      other_income: 'Pendapatan Lain',
      cancelled: 'Dibatalkan',
    };
    const rowsByType = (types: string[]) => transactions.filter((row: any) => types.includes(String(row.type || '')));
    const transactionAoa: any[][] = [
      ...addHeader('Detail Transaksi Keuangan'),
      ['No', 'Tanggal', 'Tipe', 'No Invoice', 'Platform', 'Keterangan', 'Debit', 'Kredit', 'Dana Bersih', 'Biaya Platform', 'Saldo Piutang'],
      ...transactions.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        typeLabels[row.type] || row.type || '-',
        row.invoiceNumber || '-',
        getPlatformDisplayName(row.platform || ''),
        row.description || '-',
        Number(row.debit || 0),
        Number(row.credit || 0),
        Number(row.netAmount || 0),
        Number(row.platformFee || 0),
        row.balance === null || row.balance === undefined ? '' : Number(row.balance || 0),
      ]),
    ];
    appendSheet('03 Detail Transaksi', transactionAoa, [6, 14, 22, 22, 18, 48, 18, 18, 18, 18, 18], ['G', 'H', 'I', 'J', 'K']);

    // ── Sheet 4: Detail transaksi dikelompokkan per tanggal ────────────────
    const groupedByDate = transactions.reduce((map: Record<string, any[]>, row: any) => {
      const key = row.date ? new Date(row.date).toISOString().slice(0, 10) : 'Tanpa Tanggal';
      if (!map[key]) map[key] = [];
      map[key].push(row);
      return map;
    }, {});
    const groupedDetailAoa: any[][] = [
      ...addHeader('Detail Transaksi Keuangan Per Tanggal', 'Setiap tanggal memiliki subtotal agar mudah dicocokkan dengan catatan harian.'),
    ];

    Object.keys(groupedByDate).sort().forEach((dateKey) => {
      const rows = groupedByDate[dateKey];
      const readableDate = dateKey === 'Tanpa Tanggal'
        ? dateKey
        : new Date(dateKey).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      const subtotal = rows.reduce((acc: any, row: any) => {
        acc.debit += Number(row.debit || 0);
        acc.credit += Number(row.credit || 0);
        acc.netAmount += Number(row.netAmount || 0);
        acc.platformFee += Number(row.platformFee || 0);
        return acc;
      }, { debit: 0, credit: 0, netAmount: 0, platformFee: 0 });

      groupedDetailAoa.push([]);
      groupedDetailAoa.push([readableDate]);
      groupedDetailAoa.push(['No', 'Tipe', 'No Invoice', 'Platform', 'Keterangan', 'Debit', 'Kredit', 'Dana Bersih', 'Biaya Platform', 'Saldo Piutang']);
      rows.forEach((row: any, index: number) => {
        groupedDetailAoa.push([
          index + 1,
          typeLabels[row.type] || row.type || '-',
          row.invoiceNumber || '-',
          getPlatformDisplayName(row.platform || ''),
          row.description || '-',
          Number(row.debit || 0),
          Number(row.credit || 0),
          Number(row.netAmount || 0),
          Number(row.platformFee || 0),
          row.balance === null || row.balance === undefined ? '' : Number(row.balance || 0),
        ]);
      });
      groupedDetailAoa.push([
        '',
        'SUBTOTAL',
        '',
        '',
        `${rows.length} transaksi`,
        subtotal.debit,
        subtotal.credit,
        subtotal.netAmount,
        subtotal.platformFee,
        '',
      ]);
    });
    appendSheet('04 Detail Per Tanggal', groupedDetailAoa, [6, 22, 22, 18, 52, 18, 18, 18, 18, 18], ['F', 'G', 'H', 'I', 'J']);

    // ── Sheet 5: Tren Harian ────────────────────────────────────────────────
    const trendAoa: any[][] = [
      ...addHeader('Tren Harian Penjualan'),
      ['Tanggal', 'Pendapatan', 'Total Unit', 'Produk Teratas'],
      ...chartData.map((row: any) => [
        new Date(row.date).toLocaleDateString('id-ID'),
        Number(row.revenue || 0),
        Number(row.totalUnits || 0),
        (row.productList || []).slice(0, 5).map((product: any) => `${product.name} (${product.quantity})`).join(', '),
      ]),
    ];
    appendSheet('05 Tren Harian', trendAoa, [16, 22, 12, 70], ['B']);

    // ── Sheet 6: Penjualan Mentah ───────────────────────────────────────────
    const salesAoa: any[][] = [
      ...addHeader('Data Penjualan Periode'),
      ['No', 'Tanggal', 'No Penjualan', 'Customer', 'No HP', 'Platform', 'Status', 'Total', 'Dibuat Oleh'],
      ...sales.map((sale: any, index: number) => [
        index + 1,
        sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('id-ID') : '-',
        sale.saleNumber || '-',
        sale.customerName || '-',
        sale.customerPhone || '-',
        getPlatformDisplayName(sale.platform),
        sale.status || '-',
        Number(sale.totalAmount || 0),
        sale.creator?.fullName || '-',
      ]),
    ];
    appendSheet('06 Data Penjualan', salesAoa, [6, 14, 24, 28, 18, 18, 16, 18, 24], ['H']);

    // ── Sheet 7: Piutang belum lunas ───────────────────────────────────────
    const receivableRows = rowsByType(['sale_pending', 'carry_forward']);
    const receivableAoa: any[][] = [
      ...addHeader('Daftar Piutang Belum Lunas', 'Berisi saldo awal dan penjualan periode ini yang masih menjadi piutang.'),
      ['No', 'Tanggal', 'No Invoice', 'Platform', 'Keterangan', 'Nilai Piutang', 'Saldo Setelah Transaksi'],
      ...receivableRows.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        row.invoiceNumber || '-',
        getPlatformDisplayName(row.platform || ''),
        row.description || '-',
        Number(row.debit || 0),
        row.balance === null || row.balance === undefined ? '' : Number(row.balance || 0),
      ]),
      [],
      ['TOTAL', '', '', '', `${receivableRows.length} baris`, receivableRows.reduce((sum: number, row: any) => sum + Number(row.debit || 0), 0), ''],
    ];
    appendSheet('07 Piutang', receivableAoa, [6, 14, 24, 18, 52, 20, 22], ['F', 'G']);

    // ── Sheet 8: Pelunasan diterima ────────────────────────────────────────
    const settlementRows = rowsByType(['settlement', 'historical_settlement']);
    const settlementAoa: any[][] = [
      ...addHeader('Daftar Pelunasan Diterima', 'Berisi dana bersih pelunasan periode ini termasuk pelunasan piutang historis.'),
      ['No', 'Tanggal Cair', 'No Invoice', 'Tipe', 'Platform', 'Keterangan', 'Dana Bersih / Net', 'Biaya Platform Terkait'],
      ...settlementRows.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        row.invoiceNumber || '-',
        typeLabels[row.type] || row.type || '-',
        getPlatformDisplayName(row.platform || ''),
        row.description || '-',
        Number(row.netAmount || row.credit || 0),
        Number(row.platformFee || 0),
      ]),
      [],
      ['TOTAL', '', '', '', '', `${settlementRows.length} baris`, settlementRows.reduce((sum: number, row: any) => sum + Number(row.netAmount || row.credit || 0), 0), settlementRows.reduce((sum: number, row: any) => sum + Number(row.platformFee || 0), 0)],
    ];
    appendSheet('08 Pelunasan', settlementAoa, [6, 14, 24, 22, 18, 52, 20, 20], ['G', 'H']);

    // ── Sheet 9: Biaya platform / selisih ──────────────────────────────────
    const platformFeeRows = transactions.filter((row: any) => Number(row.platformFee || 0) > 0 || row.type === 'settlement_fee');
    const platformFeeAoa: any[][] = [
      ...addHeader('Daftar Biaya Platform / Selisih', 'Berisi selisih gross dan dana bersih sebagai beban platform/marketplace.'),
      ['No', 'Tanggal', 'No Invoice', 'Platform', 'Keterangan', 'Biaya Platform'],
      ...platformFeeRows.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        row.invoiceNumber || '-',
        getPlatformDisplayName(row.platform || ''),
        row.description || '-',
        Number(row.platformFee || row.credit || 0),
      ]),
      [],
      ['TOTAL', '', '', '', `${platformFeeRows.length} baris`, platformFeeRows.reduce((sum: number, row: any) => sum + Number(row.platformFee || row.credit || 0), 0)],
    ];
    appendSheet('09 Biaya Platform', platformFeeAoa, [6, 14, 24, 18, 52, 20], ['F']);

    // ── Sheet 10: Pendapatan lain ──────────────────────────────────────────
    const otherIncomeRows = rowsByType(['other_income']);
    const otherIncomeAoa: any[][] = [
      ...addHeader('Pendapatan Lain Periode'),
      ['No', 'Tanggal', 'Keterangan', 'Nominal'],
      ...otherIncomeRows.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        row.description || '-',
        Number(row.debit || 0),
      ]),
      [],
      ['TOTAL', '', `${otherIncomeRows.length} baris`, otherIncomeRows.reduce((sum: number, row: any) => sum + Number(row.debit || 0), 0)],
    ];
    appendSheet('10 Pendapatan Lain', otherIncomeAoa, [6, 14, 60, 20], ['D']);

    // ── Sheet 11: Transaksi batal ──────────────────────────────────────────
    const cancelledRows = rowsByType(['cancelled']);
    const cancelledAoa: any[][] = [
      ...addHeader('Transaksi Dibatalkan / Tidak Masuk Perhitungan'),
      ['No', 'Tanggal', 'No Invoice', 'Keterangan'],
      ...cancelledRows.map((row: any, index: number) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString('id-ID') : '-',
        row.invoiceNumber || '-',
        row.description || '-',
      ]),
    ];
    appendSheet('11 Transaksi Batal', cancelledAoa, [6, 14, 24, 70]);

    // ── Sheet 12: Rekap produk / unit ──────────────────────────────────────
    const productMap = new Map<string, { name: string; quantity: number; total: number; transactions: number }>();
    sales
      .filter((sale: any) => !['CANCELLED', 'REJECTED'].includes(sale.status))
      .forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          const productName = item.product?.name || item.productName || item.componentName || item.variantName || 'Produk tanpa nama';
          const key = String(item.productId || item.componentName || productName);
          const quantity = Number(item.quantity || 0);
          const lineTotal = Number(item.totalPrice || item.subtotal || item.price || 0);
          const current = productMap.get(key) || { name: productName, quantity: 0, total: 0, transactions: 0 };
          current.quantity += quantity;
          current.total += lineTotal;
          current.transactions += 1;
          productMap.set(key, current);
        });
      });
    const productRows = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
    const productAoa: any[][] = [
      ...addHeader('Rekap Produk / Unit Terjual'),
      ['No', 'Produk', 'Total Unit', 'Jumlah Baris Transaksi', 'Estimasi Nilai'],
      ...productRows.map((row, index) => [
        index + 1,
        row.name,
        row.quantity,
        row.transactions,
        row.total,
      ]),
      [],
      ['TOTAL', '', productRows.reduce((sum, row) => sum + row.quantity, 0), productRows.reduce((sum, row) => sum + row.transactions, 0), productRows.reduce((sum, row) => sum + row.total, 0)],
    ];
    appendSheet('12 Rekap Produk', productAoa, [6, 52, 14, 20, 20], ['E']);

    XLSX.writeFile(wb, `Laporan_Keuangan_Lunarea_${fileSafePeriod}.xlsx`);
  };

  const handleReset = () => {
    setDateRange('this_month');
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
        <div className="flex flex-col xl:flex-row gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodPreset} onValueChange={(value) => setDateRange(value as PeriodPreset)}>
              <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="this_week">Minggu Ini</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="last_month">Bulan Lalu</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-36 h-9 text-sm"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                className="w-36 h-9 text-sm"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
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

      {/* ─── RINGKASAN PIUTANG (AR LEDGER) ─── */}
      <Card className="border-2 border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-500" />
            Ringkasan Piutang Periode Ini
          </CardTitle>
          <p className="text-xs text-muted-foreground">Saldo Awal + Penjualan Baru − Pelunasan Diterima = Sisa Piutang</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
              <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Saldo Awal</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.saldoAwalPiutang || 0)}</p>
                <p className="text-[10px] text-muted-foreground">piutang terbawa</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">+ Penjualan Baru</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.omsetKeseluruhan || 0)}</p>
                <p className="text-[10px] text-muted-foreground">omset periode ini</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide">− Pelunasan Diterima</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalPelunasanNet || 0)}</p>
                <p className="text-[10px] text-muted-foreground">incl. historis</p>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">=</span>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3 text-center border-2 border-purple-500/30">
                <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide">Sisa Piutang</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(summary.saldoAkhirAR || 0)}</p>
                <p className="text-[10px] text-muted-foreground">ke bulan depan</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 3 KEY METRICS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Omset Penjualan</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-orange-500">{formatCurrency(summary.omsetKeseluruhan || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total penjualan dalam periode ini</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dana Bersih Diterima</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-blue-500">{formatCurrency(summary.danaBersih || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Uang yg benar-benar masuk ke rekening</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sisa Piutang Akhir</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <>
                <div className="text-2xl font-bold text-purple-500">{formatCurrency(summary.sisaPiutangAkhir || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total piutang yg terbawa ke bulan depan</p>
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
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row: any = payload[0]?.payload || {};
                        const productList = row.productList || [];
                        const visibleProducts = productList.slice(0, 5);
                        const remainingProducts = Math.max(productList.length - visibleProducts.length, 0);

                        return (
                          <div className="min-w-[240px] rounded-lg border bg-background p-3 text-sm shadow-md">
                            <p className="mb-2 font-semibold text-foreground">
                              {new Date(String(label || row.date || "")).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                            </p>
                            <div className="space-y-1 text-muted-foreground">
                              <div className="flex justify-between gap-4">
                                <span>Pendapatan</span>
                                <span className="font-semibold text-foreground">{formatCurrency(row.revenue || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Total Unit</span>
                                <span className="font-semibold text-foreground">{row.totalUnits || 0} unit</span>
                              </div>
                            </div>
                            {visibleProducts.length > 0 && (
                              <div className="mt-3 border-t pt-2">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produk</p>
                                <div className="space-y-1">
                                  {visibleProducts.map((product: any) => (
                                    <div key={product.name} className="flex justify-between gap-3 text-xs">
                                      <span className="max-w-[170px] truncate text-muted-foreground" title={product.name}>{product.name}</span>
                                      <span className="font-medium text-foreground">{product.quantity} unit</span>
                                    </div>
                                  ))}
                                  {remainingProducts > 0 && (
                                    <p className="text-xs text-muted-foreground">+{remainingProducts} produk lainnya</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}
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
