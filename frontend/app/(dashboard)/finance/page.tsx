'use client';

import { useState } from 'react';
import { useSales } from '@/lib/hooks/useSales';
import { usePlatforms } from '@/lib/hooks/usePlatforms';
import { useFinancialSummary } from '@/lib/hooks/useFinancial';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag as ShoppingBagIcon,
  Wallet,
  Filter,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalePlatform } from '@/types';

export default function FinancePage() {
  // Date range state (default to current month)
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
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');

  // Fetch data with date filters
  const { data: salesData, isLoading: salesLoading } = useSales({ 
    limit: 1000,
    startDate,
    endDate
  });
  const { data: platformsData, isLoading: platformsLoading } = usePlatforms();
  const { data: financialData, isLoading: financialLoading } = useFinancialSummary({ startDate, endDate });

  const sales = salesData?.data?.sales || [];
  const financialSummary = (financialData as any)?.data?.summary || {};

  const isLoading = salesLoading || financialLoading;

  // Filter sales based on selected platform (Client-side)
  const filteredSales = selectedPlatform === 'ALL' 
    ? sales 
    : sales.filter(sale => sale.platform === selectedPlatform);

  // Use financial API totals (includes OtherIncome) for summary cards
  const totalRevenueSales = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount.toString()), 0);
  // For summary cards, use the API data (all platforms) or fallback to sales total
  const totalIncomeDisplay = selectedPlatform === 'ALL'
    ? (financialSummary.totalIncome || totalRevenueSales)
    : totalRevenueSales;
  const totalExpenseDisplay = selectedPlatform === 'ALL'
    ? (financialSummary.totalExpense || 0)
    : 0;
  const danaBersihDisplay = selectedPlatform === 'ALL'
    ? (financialSummary.danaBersih || 0)
    : filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount.toString()), 0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="animate-in">
            <Breadcrumbs items={[{ label: 'Keuangan' }]} />
            <h1 className="text-3xl font-bold mt-2 tracking-tight text-gradient">Ringkasan Keuangan</h1>
            <p className="text-muted-foreground mt-1">Gambaran umum kesehatan keuangan bisnis Anda.</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/40 p-4 rounded-xl border border-border/50 animate-in [animation-delay:100ms]">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground/70 uppercase tracking-wider font-semibold">Mulai Tanggal</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground/70 uppercase tracking-wider font-semibold">Sampai Tanggal</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground/70 uppercase tracking-wider font-semibold">Platform</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Platform</SelectItem>
                {platformsLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : platformsData?.data?.filter((p: any) => p.isActive).map((p: any) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
             {/* Reset button or summary info could go here */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Card */}
        <Card className="animate-in [animation-delay:200ms] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedPlatform === 'ALL' ? 'Total Pendapatan' : `Pendapatan ${selectedPlatform}`}
            </CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[150px]" />
            ) : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(totalIncomeDisplay)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1 text-success/60" />
                  {filteredSales.length} transaksi penjualan
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense / Kredit Keluar Summary */}
        <Card className="animate-in [animation-delay:300ms] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kredit (Keluar)</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[150px]" />
            ) : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalExpenseDisplay)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Beban platform + pencatatan lain-lain
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Rincian Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {(() => {
                // Show only sales transactions
                const allTransactions = filteredSales.map(s => ({
                  id: s.id,
                  number: s.saleNumber,
                  date: new Date(s.saleDate),
                  amount: parseFloat(s.totalAmount),
                  label: `Penjualan - ${s.platform.replace('_', ' ')}`
                })).sort((a, b) => b.date.getTime() - a.date.getTime());

                if (allTransactions.length === 0) {
                  return <p className="text-sm text-gray-500 italic">Belum ada transaksi pada periode ini</p>;
                }

                return allTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{t.number}</div>
                      <div className="text-xs text-gray-500">
                        {t.date.toLocaleDateString('id-ID')} • {t.label}
                      </div>
                    </div>
                    <div className="font-bold text-success">
                      +{formatCurrency(t.amount)}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
