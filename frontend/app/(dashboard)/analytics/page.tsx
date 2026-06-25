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
  MapPin,
  ReceiptText,
  Store,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonChart, SkeletonCard } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useSalesAnalytics } from '@/lib/hooks/useAnalytics';
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
    description: 'Lihat produk dengan unit terjual, jumlah transaksi, dan nilai penjualan tertinggi.',
    icon: Boxes,
  },
  {
    key: 'regions' as const,
    title: 'Provinsi Pembeli Terbanyak',
    description: 'Lihat seluruh provinsi dengan transaksi pembeli terbanyak pada periode yang dipilih.',
    icon: MapPin,
  },
  {
    key: 'platforms' as const,
    title: 'Penjualan per Platform',
    description: 'Bandingkan performa penjualan setiap platform secara langsung.',
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
  const activeScope = regionPath.at(-1);
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

  const analytics = analyticsQuery.data?.data;
  const chartProducts = analytics?.topProducts.slice(0, 6) || [];
  const chartRegions = analytics?.topRegions.slice(0, 6) || [];
  const chartPlatforms = analytics?.topPlatforms.slice(0, 8) || [];
  const maxProductQuantity = Math.max(...(chartProducts.map((item) => item.quantitySold) || [0]), 1);
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
                    : 'Seluruh Indonesia'
                  : 'Periode sesuai filter tanggal yang dipilih.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsQuery.isLoading || !analytics ? (
              Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <>
                <Card>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Penjualan</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{analytics.summary.totalSales}</p>
                    </div>
                    <ReceiptText className="h-6 w-6 text-primary" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Nilai Penjualan</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">
                        {formatCurrency(analytics.summary.totalRevenue)}
                      </p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-success" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Data {regionLabels[regionLevel]}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{analytics.summary.mappedSales}</p>
                    </div>
                    <MapPin className="h-6 w-6 text-info" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Cakupan {regionLabels[regionLevel]}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{analytics.summary.mappingCoverage}%</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.summary.unmappedSales} penjualan belum terpetakan
                      </p>
                      {selectedCategory === 'regions' && analytics.summary.unmappedSales > 0 && (
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
                    <Boxes className="h-6 w-6 text-warning" />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {selectedCategory === 'products' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Produk Terlaris</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Menampilkan seluruh produk berdasarkan jumlah unit terjual.
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : analytics.topProducts.length === 0 ? (
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
                              'Terjual',
                            ]}
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
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="py-2 text-right font-medium">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topProducts.map((item) => (
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
                  {activeScope ? `Dalam ${activeScope.name}` : 'Menampilkan seluruh provinsi pembeli.'}
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : analytics.topRegions.length === 0 ? (
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
                            formatter={(value) => [`${value} transaksi`, 'Pembelian']}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="orderCount"
                            name="Pembelian"
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
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="py-2 text-right font-medium">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topRegions.map((item) => (
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
                  Menampilkan seluruh platform berdasarkan jumlah transaksi.
                </p>
              </CardHeader>
              <CardContent>
                {analyticsQuery.isLoading || !analytics ? (
                  <SkeletonChart />
                ) : analytics.topPlatforms.length === 0 ? (
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
                            formatter={(value) => [`${value} transaksi`, 'Penjualan']}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="orderCount"
                            name="Penjualan"
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
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="py-2 text-right font-medium">Nilai</th>
                            <th className="py-2 text-right font-medium">Rata-rata</th>
                            <th className="py-2 text-right font-medium">Kontribusi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topPlatforms.map((item) => (
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
