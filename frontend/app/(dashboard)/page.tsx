'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useProducts, useLowStockProducts } from '@/lib/hooks/useProducts';
import { useSales, useSalesStats } from '@/lib/hooks/useSales';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { useAuditLogs } from '@/lib/hooks/useAudit';
import { useSettlementStats } from '@/lib/hooks/useSettlements';
import { useOperationalAnalytics } from '@/lib/hooks/useAnalytics';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Activity,
  PlusCircle,
  History,
  ArrowRight,
  Coins,
  TrendingDown,
  RefreshCw,
  FileText,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  ChevronRight,
  Layers,
  MessageSquareWarning,
  Truck
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { SkeletonCard, SkeletonChart, SkeletonTable, SkeletonActivity } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRoleLabel } from '@/lib/utils/roleLabel';

const DynamicAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false, loading: () => <SkeletonChart /> }
);

const DynamicResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isUserRole = user?.role === 'USER';
  const isTcpRole = user?.role === 'TCP';

  useEffect(() => {
    setMounted(true);
  }, []);


  // Data Fetching
  const { 
    data: productsData, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts 
  } = useProducts();
  
  const { 
    data: lowStockData, 
    isLoading: lowStockLoading, 
    error: lowStockError,
    refetch: refetchLowStock 
  } = useLowStockProducts();
  
  const { 
    data: salesData, 
    isLoading: salesLoading, 
    error: salesError,
    refetch: refetchSales 
  } = useSales({ limit: 100 });

  const {
    data: purchasesData,
    isLoading: purchasesLoading,
    refetch: refetchPurchases
  } = usePurchases({ limit: 5 }, { enabled: user?.role !== 'TCP' });
  
  const { 
    data: auditData, 
    isLoading: auditLoading,
    refetch: refetchAudit 
  } = useAuditLogs({ limit: 5 });
  
  const {
    data: salesStatsData,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useSalesStats();
  
  const { 
    data: settlementStatsData,
    refetch: refetchSettlement 
  } = useSettlementStats({}, { enabled: user?.role !== 'TCP' });

  const {
    data: operationalAnalyticsData,
    refetch: refetchOperationalAnalytics,
  } = useOperationalAnalytics(undefined, { enabled: !!user });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const stats = useMemo(() => {
    const sales = salesData?.data?.sales || [];
    const purchases = purchasesData?.data?.purchases || [];
    
    const combinedTransactions = [
        ...sales.map((s: any) => ({ ...s, type: 'SALE' })),
        ...purchases.map((p: any) => ({ ...p, type: 'PURCHASE' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, 5);
    
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    
    // Extracted from backend stats for all-time accuracy
    const omsetKeseluruhan = (salesStatsData as any)?.data?.omsetKeseluruhan || 0;
    
    // Revenue Trend from backend
    const chartData = ((salesStatsData as any)?.data?.revenueTrend || []).map((t: any) => ({
      name: format(new Date(t.date), 'dd MMM'),
      revenue: t.revenue
    }));
    
    // Calculate growth Based on actual chartData points if possible, or keep simple
    const currentRevenue = chartData.slice(15, 30).reduce((sum: number, t: any) => sum + t.revenue, 0);
    const previousRevenue = chartData.slice(0, 15).reduce((sum: number, t: any) => sum + t.revenue, 0);
    const growth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100)
      : 0;

    return {
      totalRevenue,
      omsetKeseluruhan,
      growth,
      chartData,
      recentTransactions: combinedTransactions
    };
  }, [salesData, purchasesData]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchProducts(),
      refetchLowStock(),
      refetchSales(),
      refetchPurchases(),
      refetchAudit(),
      refetchStats(), // Now used by Admins as well for Omset & Chart
      refetchOperationalAnalytics(),
      user?.role !== 'TCP' && refetchSettlement()
    ]);
    setIsRefreshing(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (!user || !mounted) return null;

  // ─── PUSAT ROLE: Tampilan Proses Penjualan ────────────────────────────────
  if (user.role === 'TCP') {
    const allSales: any[] = salesData?.data?.sales || [];
    const ops = operationalAnalyticsData?.data;
    const complaintPendingReviewCount = ops?.complaints.pendingReview || 0;
    const ticketWaitingExecutionCount = ops?.tickets.waitingTcpExecution || 0;
    const ticketExecutingCount = ops?.tickets.tcpExecuting || 0;

    const stats = salesStatsData?.data || {
      WAITING_APPROVAL: 0,
      PENDING: 0,
      APPROVED: 0,
      PROCESSED: 0,
      CANCELLED: 0,
      todaySales: 0,
      totalSales: 0
    };

    const todayCount = stats.todaySales || 0;
    const pendingCount = (stats.WAITING_APPROVAL || 0) + (stats.PENDING || 0);
    const approvedCount = stats.APPROVED || 0;
    const processedCount = stats.PROCESSED || 0;
    const cancelledCount = stats.CANCELLED || 0;
    const rejectedCount = (stats as any).REJECTED || 0;
    // Use sum of displayed statuses as denominator so percentages add up to 100%
    const displayedTotal = pendingCount + approvedCount + processedCount + cancelledCount + rejectedCount || 1;

    const pct = (n: number) => Math.round((n / displayedTotal) * 100);

    const recentSales = allSales.slice(0, 10);

    const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
      WAITING_APPROVAL: { label: 'Menunggu',  color: 'text-amber-600',  bg: 'bg-amber-100 text-amber-800' },
      PENDING:          { label: 'Pending',   color: 'text-amber-600',  bg: 'bg-amber-100 text-amber-800' },
      APPROVED:         { label: 'Disetujui', color: 'text-blue-600',   bg: 'bg-blue-100 text-blue-800'   },
      PROCESSED:        { label: 'Diproses',  color: 'text-green-600',  bg: 'bg-green-100 text-green-800' },
      CANCELLED:        { label: 'Dibatalkan',color: 'text-red-600',    bg: 'bg-red-100 text-red-800'     },
      REJECTED:         { label: 'Ditolak',   color: 'text-red-700',    bg: 'bg-red-100 text-red-900'     },
    };

    return (
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Proses Penjualan</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Selamat datang, <span className="font-bold text-foreground">{user.fullName}</span>. Pantau status penjualan kamu di sini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">Role: PUSAT</Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memuat...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Today's Transactions */}
          {salesLoading ? <SkeletonCard /> : (
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:100ms]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Penjualan Hari Ini</p>
                    <p className="text-2xl font-bold text-primary">{statsLoading ? '...' : todayCount}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">transaksi dibuat hari ini</p>
              </CardContent>
            </Card>
          )}

          {/* Pending */}
          {salesLoading ? <SkeletonCard /> : (
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:150ms]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Menunggu Persetujuan</p>
                    <p className="text-2xl font-bold text-amber-500">{statsLoading ? '...' : pendingCount}</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-2xl">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-amber-500 font-medium">
                  {pendingCount > 0 ? 'Perlu tindak lanjut' : 'Tidak ada yang pending'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Processed */}
          {salesLoading ? <SkeletonCard /> : (
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:200ms]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Sudah Diproses</p>
                    <p className="text-2xl font-bold text-green-600">{processedCount}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-2xl">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-green-600 font-medium">Selesai diproses</p>
              </CardContent>
            </Card>
          )}

          {/* Cancelled */}
          {salesLoading ? <SkeletonCard /> : (
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:250ms]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Dibatalkan</p>
                    <p className="text-2xl font-bold text-destructive">{cancelledCount}</p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-2xl">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">dari {allSales.length} total</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Komplen Menunggu Review</p>
                  <p className="text-2xl font-bold text-amber-600">{complaintPendingReviewCount}</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <MessageSquareWarning className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <Link href="/complaints" className="mt-3 inline-flex text-xs font-medium text-primary hover:underline">
                Buka halaman Komplen
              </Link>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Komplen Siap Kirim Pengganti</p>
                  <p className="text-2xl font-bold text-blue-600">{ticketWaitingExecutionCount}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Tiket retur sudah masuk tahap eksekusi PUSAT</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Retur Sedang Dieksekusi</p>
                  <p className="text-2xl font-bold text-green-600">{ticketExecutingCount}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-2xl">
                  <ClipboardList className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Pantau tiket yang sedang dieksekusi PUSAT</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Retur Menunggu Barang Kembali</p>
                  <p className="text-2xl font-bold text-violet-600">{ops?.returns.waitingItemReturn || 0}</p>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-2xl">
                  <FileText className="h-6 w-6 text-violet-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Barang fisik masih ditunggu tim</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel */}
        {salesLoading ? <SkeletonCard /> : (
          <Card className="border-none shadow-lg animate-in [animation-delay:300ms]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Pipeline Status Penjualan
              </CardTitle>
              <CardDescription>Proporsi status dari {allSales.length} penjualan terakhir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'WAITING_APPROVAL', count: stats.WAITING_APPROVAL || 0, barColor: 'bg-amber-500'  },
                { key: 'PENDING',          count: stats.PENDING || 0,          barColor: 'bg-amber-400'  },
                { key: 'APPROVED',         count: approvedCount,               barColor: 'bg-blue-500'   },
                { key: 'PROCESSED',        count: processedCount,              barColor: 'bg-green-500'  },
                { key: 'CANCELLED',        count: cancelledCount,              barColor: 'bg-red-400'    },
                { key: 'REJECTED',         count: rejectedCount,               barColor: 'bg-red-600'    },
              ].map(({ key, count, barColor }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{statusMeta[key].label}</span>
                    <div className="text-muted-foreground font-mono flex items-center gap-1">
                      <span>{count}</span>
                      <span className="text-xs">({pct(count)}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${pct(count)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  // ─── END PUSAT ─────────────────────────────────────────────────────────────


  const totalProducts = productsData?.data?.pagination?.total || 0;
  const lowStockCount = lowStockData?.data?.length || 0;
  const myComplaintOps = operationalAnalyticsData?.data?.complaints;
  const myReturnOps = operationalAnalyticsData?.data?.returns;
  const myComplaintsTotal = myComplaintOps?.total || 0;
  const myComplaintsPending = myComplaintOps?.pendingReview || 0;
  const myComplaintsShipped = myComplaintOps?.replacementShipped || 0;
  const isLoading = productsLoading || lowStockLoading || salesLoading || purchasesLoading;
  const hasError = productsError || lowStockError || salesError;

  // Show error state if critical data fails
  if (hasError && !isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold">Dasbor Utama</h1>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Muat Ulang
          </Button>
        </div>
        <ErrorState 
          message="Gagal memuat data dashboard. Silakan coba lagi."
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Dasbor Utama</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Selamat datang kembali, <span className="font-bold text-foreground">{user.fullName}</span>. Senang melihatmu kembali :)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Role: {formatRoleLabel(user?.role) || 'None'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Memuat...' : 'Refresh'}
          </Button>
          </div>
          {user?.role !== 'TCP' && (
            <Link href="/sales/new">
              <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                <PlusCircle className="h-4 w-4" />
                Transaksi Baru
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 tour-dashboard-stats">
        {/* Revenue Card */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:100ms]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {user?.role !== 'TCP' ? 'Total Pendapatan Bersih' : 'Total Penjualan'}
                  </p>
                  <p className="text-2xl font-bold text-success">
                    {user?.role !== 'TCP' && (settlementStatsData as any)?.data 
                      ? formatCurrency(parseFloat((settlementStatsData as any).data.totalNet || '0'))
                      : formatCurrency(stats.totalRevenue)
                    }
                  </p>
                </div>
                <div className="p-3 bg-success/10 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className={`mt-4 flex items-center text-xs font-medium ${stats.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.growth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                <span>{stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}% dari bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Products Card */}
        {user?.role !== 'TCP' && (
          isLoading ? (
            <SkeletonCard />
          ) : (
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:200ms]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Produk</p>
                    <p className="text-2xl font-bold text-info">{totalProducts}</p>
                  </div>
                  <div className="p-3 bg-info/10 rounded-2xl">
                    <Package className="h-6 w-6 text-info" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-info font-medium">
                  <Activity className="h-3 w-3 mr-1" />
                  <span>Aktif di sistem</span>
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Low Stock Card */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm card-hover animate-in [animation-delay:400ms]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Stok Menipis</p>
                  <p className="text-2xl font-bold text-orange-500">{lowStockCount}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-2xl">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-orange-500 font-medium font-mono">
                {lowStockCount > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Perlu Restock Segera!
                  </>
                ) : (
                  'Stok Aman'
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isUserRole && (
        <Card className="border-none shadow-lg bg-card/60 animate-in [animation-delay:430ms]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5 text-primary" />
                Ringkasan Komplen Saya
              </CardTitle>
              <CardDescription>Pantau progres komplen pesanan Anda.</CardDescription>
            </div>
            <Link href="/complaints">
              <Button variant="outline" size="sm">Lihat Detail</Button>
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Komplen</p>
              <p className="text-2xl font-bold">{myComplaintsTotal}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Menunggu Review PUSAT</p>
              <p className="text-2xl font-bold text-amber-600">{myComplaintsPending}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Sedang Dikirim</p>
              <p className="text-2xl font-bold text-green-600">{myComplaintsShipped}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Retur Aktif Saya</p>
              <p className="text-2xl font-bold text-blue-600">{myReturnOps?.active || 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement Stats - Simplified */}
      {user?.role !== 'TCP' && (settlementStatsData as any)?.data && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 animate-in [animation-delay:450ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-600" />
              Statistik Pelunasan
            </CardTitle>
            <CardDescription>3 angka utama yang perlu kamu tahu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-l-orange-500 border border-orange-200 dark:border-orange-800">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Omset Penjualan</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.omsetKeseluruhan)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  dari {Math.max(0, ((salesStatsData as any)?.data?.totalSales || 0) - ((salesStatsData as any)?.data?.CANCELLED || 0) - ((salesStatsData as any)?.data?.REJECTED || 0))} transaksi aktif
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-l-blue-500 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dana Bersih Diterima</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(parseFloat((settlementStatsData as any).data.totalNet || '0'))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(settlementStatsData as any).data.settledCount} sudah lunas
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-l-purple-500 border border-purple-200 dark:border-purple-800">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Belum Dilunasi</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(parseFloat((settlementStatsData as any).data.totalPendingAmount || '0'))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(settlementStatsData as any).data.pendingCount} transaksi pending
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Link href="/financial-summary">
                <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  Lihat Ringkasan Lengkap →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Chart */}
        {isLoading ? (
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
        ) : (
          <Card className="lg:col-span-2 border-border/50 shadow-xl overflow-hidden animate-in [animation-delay:500ms]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tren Pendapatan
              </CardTitle>
              <CardDescription>Visualisasi pendapatan 30 hari terakhir.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] md:h-[350px] w-full mt-4">
                <DynamicResponsiveContainer width="100%" height="100%">
                  <DynamicAreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="var(--success)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  </DynamicAreaChart>
                </DynamicResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sidebar */}
        <div className="space-y-8 animate-in [animation-delay:600ms]">
          {/* Quick Actions */}
          {/* Quick Actions - Only for Admins */}
          {['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
            <Card className="border-border/50 shadow-lg bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Link href="/products/new">
                  <Button variant="ghost" className="w-full justify-between bg-card border border-border/50 hover:bg-primary/10 hover:text-primary rounded-xl px-4 py-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5" />
                      <span>Tambah Produk</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </Button>
                </Link>
                <Link href="/purchases/new">
                  <Button variant="ghost" className="w-full justify-between bg-card border border-border/50 hover:bg-success/10 hover:text-success rounded-xl px-4 py-6">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Restock Barang</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}


        </div>
      </div>

      {/* Recent Transactions Table */}
      <Card className="border-border/50 shadow-xl animate-in [animation-delay:700ms] tour-recent-transactions">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaksi Terkini</CardTitle>
            <CardDescription>Daftar penjualan dan pembelian terbaru.</CardDescription>
          </div>
          <Link href="/financial-summary">
            <Button variant="outline" size="sm" className="rounded-xl">Laporan Lanjut</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : stats.recentTransactions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Belum ada transaksi"
              description="Transaksi akan muncul di sini setelah Anda membuat penjualan atau pembelian"
              action={{
                label: "Buat Transaksi Baru",
                href: "/sales/new"
              }}
            />
          ) : (
            <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {stats.recentTransactions.map((tx: any) => (
                        <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 shadow-sm">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-[12px]">{tx.saleNumber || tx.purchaseNumber}</span>
                                    {/* Status Badge */}
                                    {tx.type === 'SALE' ? (
                                        ['CANCELLED', 'REJECTED'].includes(tx.status) ? (
                                            <Badge variant="destructive" className="text-[9px] uppercase h-4 px-1">{tx.status === 'REJECTED' ? 'Ditolak' : 'Batal'}</Badge>
                                        ) : tx.settlement ? (
                                            <Badge className="bg-green-600 text-[9px] uppercase h-4 px-1">Lunas</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[9px] uppercase h-4 px-1">Pending</Badge>
                                        )
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{tx.status}</Badge>
                                    )}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                                </div>
                            </div>
                            <div className={`font-bold text-[12px] ${tx.type === 'SALE' ? 'text-success' : 'text-destructive'}`}>
                                {tx.type === 'SALE' ? '+' : '-'}{formatCurrency(parseFloat(tx.totalAmount))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="py-3 px-4 font-medium">No. Transaksi</th>
                        <th className="py-3 px-4 font-medium">Tipe</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {stats.recentTransactions.map((tx: any) => (
                        <tr key={`${tx.type}-${tx.id}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 font-mono font-medium text-xs">
                            {tx.saleNumber || tx.purchaseNumber}
                        </td>
                        <td className="py-4 px-4">
                            <Badge variant={tx.type === 'SALE' ? 'success' : 'info'} className="text-[10px] uppercase">
                            {tx.type}
                            </Badge>
                        </td>
                        <td className="py-4 px-4 text-xs">
                      {tx.type === 'SALE' ? (
                        ['CANCELLED', 'REJECTED'].includes(tx.status) ? (
                          <Badge variant="destructive" className="h-5">{tx.status === 'REJECTED' ? 'Ditolak' : 'Dibatalkan'}</Badge>
                        ) : tx.settlement ? (
                          <Badge className="bg-green-600 h-5">Lunas</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 h-5">Pending</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="h-5 text-muted-foreground">{tx.status}</Badge>
                      )}
                        </td>
                        <td className={`py-4 px-4 text-right font-bold ${tx.type === 'SALE' ? 'text-success' : 'text-destructive'}`}>
                            {tx.type === 'SALE' ? '+' : '-'}{formatCurrency(parseFloat(tx.totalAmount))}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
