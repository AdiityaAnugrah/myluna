'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  MapPin,
  MessageSquareWarning,
  ReceiptText,
  Store,
  Ticket,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonChart, SkeletonCard } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useOperationalAnalytics, useSalesAnalytics } from '@/lib/hooks/useAnalytics';
import { SalesAnalytics } from '@/types';
import { UnmappedSalesDialog } from '@/components/analytics/UnmappedSalesDialog';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const regionLabels = {
  province: 'Provinsi',
  regency: 'Kabupaten/Kota',
  district: 'Kecamatan',
  village: 'Kelurahan/Desa',
} as const;

type RegionLevel = keyof typeof regionLabels;
type AnalyticsRegion = SalesAnalytics['topRegions'][number];
type AnalyticsCategory = 'products' | 'regions' | 'platforms' | null;
type SummaryCardItem = {
  key: string;
  label: string;
  value: string;
  description?: string;
  icon: typeof ReceiptText;
  iconClassName?: string;
};

interface RegionPathItem {
  id: number;
  name: string;
  level: RegionLevel;
}

const regionLevels: RegionLevel[] = ['province', 'regency', 'district', 'village'];

const shortenLabel = (value: string, length = 10) =>
  value.length > length ? `${value.slice(0, length - 1)}...` : value;

const formatRegionChartLabel = (value: string) =>
  shortenLabel(value.replace(/^Kabupaten\s+/i, 'Kab. '), 14);

const analyticsCategoryOptions = [
  {
    key: 'products' as const,
    title: 'Produk Terlaris',
    description: 'Lihat produk yang paling laku berdasarkan total unit terjual, ragam varian, dan nilai penjualannya.',
    icon: Boxes,
  },
  {
    key: 'regions' as const,
    title: 'Provinsi Pembeli Terbanyak',
    description: 'Lihat wilayah dengan pembelian terbanyak berdasarkan transaksi, unit terjual, dan nilai penjualan pada periode yang dipilih.',
    icon: MapPin,
  },
  {
    key: 'platforms' as const,
    title: 'Penjualan per Platform',
    description: 'Bandingkan performa setiap platform berdasarkan transaksi, unit terjual, nilai penjualan, dan kontribusinya.',
    icon: Store,
  },
];

export default function AnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(() => today.toISOString().slice(0, 10));
  const [selectedCategory, setSelectedCategory] = useState<AnalyticsCategory>(null);
  const [regionPath, setRegionPath] = useState<RegionPathItem[]>([]);
  const [unmappedDialogOpen, setUnmappedDialogOpen] = useState(false);

  const regionLevel = regionLevels[Math.min(regionPath.length, regionLevels.length - 1)];
  const activeScope = regionPath.length > 0 ? regionPath[regionPath.length - 1] : undefined;
  const canDrillDown = selectedCategory === 'regions' && regionLevel !== 'village';
  const isDetailView = selectedCategory !== null;

  const analyticsParams = {
    startDate,
    endDate,
    regionLevel,
    ...(activeScope && {
      scopeLevel: activeScope.level,
      scopeRegionId: activeScope.id,
    }),
    limit: selectedCategory === 'regions' ? 50 : 50,
  };

  const analyticsQuery = useSalesAnalytics(analyticsParams, {
    enabled: isDetailView,
  });
  const operationsQuery = useOperationalAnalytics(
    { startDate, endDate },
    { enabled: true }
  );

  const analytics = analyticsQuery.data?.data;
  const operations = operationsQuery.data?.data;
  const analyticsSummary = {
    totalSales: analytics?.summary?.totalSales ?? 0,
    totalRevenue: analytics?.summary?.totalRevenue ?? 0,
    totalQuantitySold: analytics?.summary?.totalQuantitySold ?? 0,
    averageOrderValue: analytics?.summary?.averageOrderValue ?? 0,
    totalProductsSold: analytics?.summary?.totalProductsSold ?? 0,
    totalVariantsSold: analytics?.summary?.totalVariantsSold ?? 0,
    totalRegionsCovered: analytics?.summary?.totalRegionsCovered ?? 0,
    totalPlatformsUsed: analytics?.summary?.totalPlatformsUsed ?? 0,
    mappedSales: analytics?.summary?.mappedSales ?? 0,
    unmappedSales: analytics?.summary?.unmappedSales ?? 0,
    mappingCoverage: analytics?.summary?.mappingCoverage ?? 0,
  };
  const topProducts = Array.isArray(analytics?.topProducts) ? analytics.topProducts : [];
  const topVariants = Array.isArray(analytics?.topVariants) ? analytics.topVariants : [];
  const topRegions = Array.isArray(analytics?.topRegions) ? analytics.topRegions : [];
  const topPlatforms = Array.isArray(analytics?.topPlatforms) ? analytics.topPlatforms : [];
  const chartProducts = topProducts.slice(0, 6);
  const chartVariants = topVariants.slice(0, 6);
  const chartRegions = topRegions.slice(0, 6);
  const chartPlatforms = topPlatforms.slice(0, 8);
  const maxProductQuantity = Math.max(...(chartProducts.map((item) => item.quantitySold) || [0]), 1);
  const maxVariantQuantity = Math.max(...(chartVariants.map((item) => item.quantitySold) || [0]), 1);
  const maxRegionOrders = Math.max(...(chartRegions.map((item) => item.orderCount) || [0]), 1);
  const maxPlatformOrders = Math.max(...(chartPlatforms.map((item) => item.orderCount) || [0]), 1);

  const openCategory = (category: Exclude<AnalyticsCategory, null>) => {
    setSelectedCategory(category);
    if (category === 'regions') {
      setRegionPath([]);
    }
  };

  const closeDetailView = () => {
    setSelectedCategory(null);
    setRegionPath([]);
  };

  const selectRegion = (region: AnalyticsRegion) => {
    if (!canDrillDown) return;
    setRegionPath((path) => [
      ...path,
      { id: region.regionId, name: region.regionName, level: regionLevel },
    ]);
  };

  const navigateToRegion = (pathIndex: number) => {
    setRegionPath((path) => path.slice(0, pathIndex + 1));
  };

  const selectedCategoryTitle =
    selectedCategory === 'products'
      ? 'Produk Terlaris'
      : selectedCategory === 'regions'
        ? `${regionLabels[regionLevel]} Pembeli Terbanyak`
        : selectedCategory === 'platforms'
          ? 'Penjualan per Platform'
          : '';

  const unmappedSalesPercentage = analytics
    ? analyticsSummary.totalSales > 0
      ? Math.round((analyticsSummary.unmappedSales / analyticsSummary.totalSales) * 10000) / 100
      : 0
    : 0;

  const summaryCards: SummaryCardItem[] = analytics
    ? selectedCategory === 'products'
      ? [
          {
            key: 'quantity',
            label: 'Total Unit Terjual',
            value: analyticsSummary.totalQuantitySold.toLocaleString('id-ID'),
            description: 'Akumulasi seluruh unit produk yang berhasil terjual.',
            icon: Boxes,
            iconClassName: 'text-primary',
          },
          {
            key: 'products',
            label: 'Produk Terjual',
            value: analyticsSummary.totalProductsSold.toLocaleString('id-ID'),
            description: 'Jumlah produk unik yang ikut terjual.',
            icon: ReceiptText,
            iconClassName: 'text-success',
          },
          {
            key: 'variants',
            label: 'Varian Terjual',
            value: analyticsSummary.totalVariantsSold.toLocaleString('id-ID'),
            description: 'Jumlah kombinasi produk-varian yang terjual.',
            icon: BarChart3,
            iconClassName: 'text-info',
          },
          {
            key: 'revenue',
            label: 'Nilai Penjualan',
            value: formatCurrency(analyticsSummary.totalRevenue),
            description: 'Total omzet dari seluruh produk yang terjual.',
            icon: Store,
            iconClassName: 'text-warning',
          },
        ]
      : selectedCategory === 'regions'
        ? [
            {
              key: 'sales',
              label: 'Total Transaksi',
              value: analyticsSummary.totalSales.toLocaleString('id-ID'),
              description: 'Jumlah pembelian yang tercatat pada periode ini.',
              icon: ReceiptText,
              iconClassName: 'text-primary',
            },
            {
              key: 'quantity',
              label: 'Total Unit Terjual',
              value: analyticsSummary.totalQuantitySold.toLocaleString('id-ID'),
              description: 'Akumulasi unit yang terjual pada seluruh wilayah yang tercakup.',
              icon: BarChart3,
              iconClassName: 'text-success',
            },
            {
              key: 'unmapped-rate',
              label: 'Belum Terpetakan',
              value: `${unmappedSalesPercentage}%`,
              description: analyticsSummary.unmappedSales > 0
                ? `${analyticsSummary.unmappedSales} penjualan belum terpetakan ke wilayah.`
                : 'Tidak ada penjualan yang belum terpetakan ke wilayah.',
              icon: MapPin,
              iconClassName: 'text-info',
            },
            {
              key: 'revenue',
              label: 'Nilai Penjualan',
              value: formatCurrency(analyticsSummary.totalRevenue),
              description: `Cakupan ${regionLabels[regionLevel].toLowerCase()}: ${analyticsSummary.totalRegionsCovered.toLocaleString('id-ID')} wilayah.`,
              icon: Boxes,
              iconClassName: 'text-warning',
            },
          ]
        : [
            {
              key: 'sales',
              label: 'Total Transaksi',
              value: analyticsSummary.totalSales.toLocaleString('id-ID'),
              description: 'Jumlah transaksi yang tercatat dari seluruh platform pada periode ini.',
              icon: ReceiptText,
              iconClassName: 'text-primary',
            },
            {
              key: 'revenue',
              label: 'Nilai Penjualan',
              value: formatCurrency(analyticsSummary.totalRevenue),
              description: 'Total omzet gabungan dari seluruh platform yang aktif.',
              icon: BarChart3,
              iconClassName: 'text-success',
            },
            {
              key: 'platforms',
              label: 'Platform Aktif',
              value: analyticsSummary.totalPlatformsUsed.toLocaleString('id-ID'),
              description: 'Jumlah platform yang menghasilkan transaksi pada periode terpilih.',
              icon: Store,
              iconClassName: 'text-info',
            },
            {
              key: 'aov',
              label: 'Rata-rata per Transaksi',
              value: formatCurrency(analyticsSummary.averageOrderValue),
              description: 'Rata-rata nilai penjualan untuk setiap transaksi lintas platform.',
              icon: Boxes,
              iconClassName: 'text-warning',
            },
          ]
    : [];

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumbs items={[{ label: 'Analisa' }]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analisa Penjualan</h1>
        <p className="mt-1 text-muted-foreground">
          Pilih kategori analisa yang ingin ditampilkan.
        </p>
      </div>

      <div className="space-y-4 border-y py-5">
        <div className="grid grid-cols-1 gap-4 md:max-w-2xl md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="analyticsStartDate">Dari Tanggal</Label>
            <Input
              id="analyticsStartDate"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analyticsEndDate">Sampai Tanggal</Label>
            <Input
              id="analyticsEndDate"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        {selectedCategory === 'regions' && (
          <div className="space-y-2">
            <Label>Cakupan Wilayah</Label>
            <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1">
              {regionPath.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setRegionPath((path) => path.slice(0, -1))}
                  title="Kembali satu tingkat"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Kembali satu tingkat wilayah</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => setRegionPath([])}
              >
                Indonesia
              </Button>
              {regionPath.map((item, index) => (
                <div key={`${item.level}-${item.id}`} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 max-w-52"
                    onClick={() => navigateToRegion(index)}
                  >
                    <span className="truncate">{item.name}</span>
                  </Button>
                </div>
              ))}
              <span className="ml-auto px-2 text-xs font-medium text-muted-foreground">
                {regionLabels[regionLevel]}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Komplen Aktif</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {operationsQuery.isLoading ? '...' : (operations?.complaints.active || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review: {operations?.complaints.pendingReview || 0} • Ditangani: {operations?.complaints.acceptedByTcp || 0} • Pengganti Dikirim: {operations?.complaints.replacementShipped || 0}
              </p>
            </div>
            <MessageSquareWarning className="h-6 w-6 shrink-0 text-warning" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Retur Aktif</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {operationsQuery.isLoading ? '...' : (operations?.returns.active || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review: {operations?.returns.pendingReview || 0} • Menunggu Barang: {operations?.returns.waitingItemReturn || 0} • Siap Finalisasi: {operations?.returns.itemReceived || 0}
              </p>
            </div>
            <ClipboardList className="h-6 w-6 shrink-0 text-info" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Tiket Retur Aktif</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {operationsQuery.isLoading ? '...' : (operations?.tickets.active || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diskusi: {operations?.tickets.inDiscussion || 0} • Tunggu TCP: {operations?.tickets.waitingTcpExecution || 0} • Dieksekusi: {operations?.tickets.tcpExecuting || 0}
              </p>
            </div>
            <Ticket className="h-6 w-6 shrink-0 text-primary" />
          </CardContent>
        </Card>
      </div>

      {!isDetailView ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {analyticsCategoryOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className="text-left"
              onClick={() => openCategory(option.key)}
            >
              <Card className="h-full border transition-colors hover:border-primary hover:bg-primary/5">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <option.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{option.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : analyticsQuery.isError ? (
        <ErrorState
          message="Gagal memuat data analisa."
          onRetry={() => analyticsQuery.refetch()}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={closeDetailView}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Kategori
            </Button>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{selectedCategoryTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'regions'
                  ? activeScope
                    ? `Dalam ${activeScope.name}`
                    : 'Melihat sebaran pembelian dari seluruh Indonesia.'
                  : selectedCategory === 'products'
                    ? 'Melihat performa produk dan varian yang terjual pada periode yang dipilih.'
                    : selectedCategory === 'platforms'
                      ? 'Membandingkan performa penjualan antar platform pada periode yang dipilih.'
                    : 'Periode sesuai filter tanggal yang dipilih.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsQuery.isLoading || !analytics ? (
              Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <>
                {summaryCards.map((card) => (
                  <Card key={card.key}>
                    <CardContent className="flex items-start justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums break-words">{card.value}</p>
                        {card.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                        )}
                        {selectedCategory === 'regions' && card.key === 'unmapped-rate' && analyticsSummary.unmappedSales > 0 && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setUnmappedDialogOpen(true)}
                          >
                            Lihat rincian
                          </Button>
                        )}
                      </div>
                      <card.icon className={`h-6 w-6 shrink-0 ${card.iconClassName || 'text-primary'}`} />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {selectedCategory === 'products' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Produk Terlaris</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Menampilkan produk yang paling laku berdasarkan jumlah unit terjual pada periode terpilih.
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : topProducts.length === 0 ? (
                  <EmptyState
                    icon={Boxes}
                    title="Belum ada data produk"
                    description="Tidak ada penjualan aktif pada periode ini."
                  />
                ) : (
                  <>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartProducts}
                          margin={{ top: 28, right: 8, bottom: 16, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis
                            type="category"
                            dataKey="productName"
                            interval={0}
                            height={44}
                            tickMargin={8}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => shortenLabel(value, 10)}
                          />
                          <YAxis type="number" domain={[0, maxProductQuantity]} allowDecimals={false} width={42} />
                          <Tooltip
                            formatter={(value, name) => [
                              name === 'quantitySold' ? `${value} unit` : value,
                              'Unit Terjual',
                            ]}
                            labelFormatter={(label) => `Produk: ${String(label)}`}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="quantitySold"
                            name="Terjual"
                            fill="var(--primary)"
                            maxBarSize={48}
                            radius={[4, 4, 0, 0]}
                          >
                            <LabelList
                              dataKey="quantitySold"
                              position="top"
                              className="fill-foreground"
                              fontSize={11}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[720px] table-fixed text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="w-[38%] py-2 font-medium">Produk</th>
                            <th className="py-2 text-right font-medium">Unit Terjual</th>
                            <th className="py-2 text-right font-medium">Transaksi Terkait</th>
                            <th className="py-2 text-right font-medium">Nilai Penjualan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.map((item) => (
                            <tr key={item.productId} className="border-b last:border-0">
                              <td className="py-2.5">
                                <div className="break-words font-medium">{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.sku}</div>
                              </td>
                              <td className="py-2.5 text-right tabular-nums">{item.quantitySold}</td>
                              <td className="py-2.5 text-right tabular-nums">{item.orderCount}</td>
                              <td className="py-2.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 border-t pt-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Varian Terlaris</h3>
                        <p className="text-sm text-muted-foreground">
                          Menampilkan varian yang paling laku agar analisa produk juga terlihat sampai level varian.
                        </p>
                      </div>

                      {topVariants.length === 0 ? (
                        <EmptyState
                          icon={Boxes}
                          title="Belum ada data varian"
                          description="Tidak ada penjualan varian pada periode ini."
                        />
                      ) : (
                        <>
                          <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartVariants.map((item) => ({
                                  ...item,
                                  label: `${item.productName} - ${item.variantName}`,
                                }))}
                                margin={{ top: 28, right: 8, bottom: 16, left: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                  type="category"
                                  dataKey="label"
                                  interval={0}
                                  height={44}
                                  tickMargin={8}
                                  tick={{ fontSize: 10 }}
                                  tickFormatter={(value) => shortenLabel(value, 12)}
                                />
                                <YAxis type="number" domain={[0, maxVariantQuantity]} allowDecimals={false} width={42} />
                                <Tooltip
                                  formatter={(value) => [`${value} unit`, 'Unit Terjual']}
                                  labelFormatter={(label) => `Varian: ${String(label)}`}
                                  contentStyle={{
                                    backgroundColor: 'var(--card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                  }}
                                />
                                <Bar
                                  dataKey="quantitySold"
                                  name="Terjual"
                                  fill="var(--warning)"
                                  maxBarSize={48}
                                  radius={[4, 4, 0, 0]}
                                >
                                  <LabelList
                                    dataKey="quantitySold"
                                    position="top"
                                    className="fill-foreground"
                                    fontSize={11}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[820px] table-fixed text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="w-[30%] py-2 font-medium">Produk</th>
                                  <th className="w-[24%] py-2 font-medium">Varian</th>
                                  <th className="py-2 text-right font-medium">Unit Terjual</th>
                                  <th className="py-2 text-right font-medium">Transaksi Terkait</th>
                                  <th className="py-2 text-right font-medium">Nilai Penjualan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {topVariants.map((item, index) => (
                                  <tr key={`${item.productId}-${item.variantName}-${index}`} className="border-b last:border-0">
                                    <td className="py-2.5">
                                      <div className="break-words font-medium">{item.productName}</div>
                                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                                    </td>
                                    <td className="py-2.5">{item.variantName}</td>
                                    <td className="py-2.5 text-right tabular-nums">{item.quantitySold}</td>
                                    <td className="py-2.5 text-right tabular-nums">{item.orderCount}</td>
                                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {selectedCategory === 'regions' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{regionLabels[regionLevel]} Pembeli Terbanyak</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeScope
                    ? `Menampilkan wilayah dengan pembelian terbanyak di dalam ${activeScope.name}.`
                    : 'Menampilkan wilayah dengan pembelian terbanyak pada periode terpilih.'}
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : topRegions.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="Belum ada data wilayah"
                    description="Penjualan lama tanpa pilihan wilayah tidak masuk peringkat wilayah."
                  />
                ) : (
                  <>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartRegions}
                          margin={{ top: 28, right: 8, bottom: 16, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis
                            type="category"
                            dataKey="regionName"
                            interval={0}
                            height={44}
                            tickMargin={8}
                            tick={{ fontSize: 10 }}
                            tickFormatter={formatRegionChartLabel}
                          />
                          <YAxis type="number" domain={[0, maxRegionOrders]} allowDecimals={false} width={42} />
                          <Tooltip
                            formatter={(value) => [`${value} transaksi`, 'Transaksi Pembelian']}
                            labelFormatter={(label) => `${regionLabels[regionLevel]}: ${String(label)}`}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="orderCount"
                            name="Transaksi Pembelian"
                            fill="var(--success)"
                            maxBarSize={48}
                            radius={[4, 4, 0, 0]}
                            cursor={canDrillDown ? 'pointer' : 'default'}
                            onClick={(entry) => {
                              const item = (entry as { payload?: AnalyticsRegion }).payload;
                              if (item) selectRegion(item);
                            }}
                          >
                            <LabelList
                              dataKey="orderCount"
                              position="top"
                              className="fill-foreground"
                              fontSize={11}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[760px] table-fixed text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="w-[38%] py-2 font-medium">{regionLabels[regionLevel]}</th>
                            <th className="py-2 text-right font-medium">Transaksi Pembelian</th>
                            <th className="py-2 text-right font-medium">Unit Terjual</th>
                            <th className="py-2 text-right font-medium">Nilai Penjualan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topRegions.map((item) => (
                            <tr key={item.regionId} className="border-b last:border-0">
                              <td className="font-medium">
                                {canDrillDown ? (
                                  <button
                                    type="button"
                                    className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onClick={() => selectRegion(item)}
                                  >
                                    <span>{item.regionName}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                                  </button>
                                ) : (
                                  <span className="block py-2.5">{item.regionName}</span>
                                )}
                              </td>
                              <td className="py-2.5 text-right tabular-nums">{item.orderCount}</td>
                              <td className="py-2.5 text-right tabular-nums">{item.quantityPurchased}</td>
                              <td className="py-2.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {selectedCategory === 'platforms' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Penjualan per Platform</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Menampilkan performa setiap platform berdasarkan transaksi, unit terjual, dan nilai penjualan.
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : topPlatforms.length === 0 ? (
                  <EmptyState
                    icon={Store}
                    title="Belum ada data platform"
                    description="Tidak ada penjualan aktif pada periode ini."
                  />
                ) : (
                  <>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartPlatforms}
                          margin={{ top: 28, right: 8, bottom: 16, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis
                            type="category"
                            dataKey="platformName"
                            interval={0}
                            height={44}
                            tickMargin={8}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => shortenLabel(value, 12)}
                          />
                          <YAxis type="number" domain={[0, maxPlatformOrders]} allowDecimals={false} width={42} />
                          <Tooltip
                            formatter={(value) => [`${value} transaksi`, 'Transaksi Penjualan']}
                            labelFormatter={(label) => `Platform: ${String(label)}`}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="orderCount"
                            name="Transaksi Penjualan"
                            fill="var(--info)"
                            maxBarSize={56}
                            radius={[4, 4, 0, 0]}
                          >
                            <LabelList
                              dataKey="orderCount"
                              position="top"
                              className="fill-foreground"
                              fontSize={11}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[760px] table-fixed text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="w-[28%] py-2 font-medium">Platform</th>
                            <th className="py-2 text-right font-medium">Transaksi Penjualan</th>
                            <th className="py-2 text-right font-medium">Unit Terjual</th>
                            <th className="py-2 text-right font-medium">Nilai Penjualan</th>
                            <th className="py-2 text-right font-medium">Rata-rata per Transaksi</th>
                            <th className="py-2 text-right font-medium">Kontribusi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topPlatforms.map((item) => (
                            <tr key={item.platformName} className="border-b last:border-0">
                              <td className="break-words py-2.5 font-medium">{item.platformName}</td>
                              <td className="py-2.5 text-right tabular-nums">{item.orderCount}</td>
                              <td className="py-2.5 text-right tabular-nums">{item.quantitySold}</td>
                              <td className="py-2.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                              <td className="py-2.5 text-right tabular-nums">
                                {formatCurrency(item.averageOrderValue)}
                              </td>
                              <td className="py-2.5 text-right tabular-nums">{item.revenueShare}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <UnmappedSalesDialog
        open={unmappedDialogOpen}
        onOpenChange={setUnmappedDialogOpen}
        params={analyticsParams}
        targetLabel={regionLabels[regionLevel]}
      />
    </div>
  );
}
