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
import { ArrowLeft, BarChart3, Boxes, ChevronRight, MapPin, ReceiptText } from 'lucide-react';
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

export default function AnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(() => today.toISOString().slice(0, 10));
  const [regionPath, setRegionPath] = useState<RegionPathItem[]>([]);
  const [unmappedDialogOpen, setUnmappedDialogOpen] = useState(false);
  const regionLevel = regionLevels[Math.min(regionPath.length, regionLevels.length - 1)];
  const activeScope = regionPath.at(-1);
  const canDrillDown = regionLevel !== 'village';

  const analyticsParams = {
    startDate,
    endDate,
    regionLevel,
    ...(activeScope && {
      scopeLevel: activeScope.level,
      scopeRegionId: activeScope.id,
    }),
    limit: 10,
  };
  const analyticsQuery = useSalesAnalytics(analyticsParams);

  const analytics = analyticsQuery.data?.data;
  const chartProducts = analytics?.topProducts.slice(0, 6) || [];
  const chartRegions = analytics?.topRegions.slice(0, 6) || [];
  const maxProductQuantity = Math.max(...(chartProducts.map((item) => item.quantitySold) || [0]), 1);
  const maxRegionOrders = Math.max(...(chartRegions.map((item) => item.orderCount) || [0]), 1);

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

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumbs items={[{ label: 'Analisa' }]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analisa Penjualan</h1>
        <p className="mt-1 text-muted-foreground">
          Perbandingan produk terlaris dan persebaran wilayah pembeli.
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
      </div>

      {analyticsQuery.isError ? (
        <ErrorState
          message="Gagal memuat data analisa."
          onRetry={() => analyticsQuery.refetch()}
        />
      ) : (
        <>
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
                      {analytics.summary.unmappedSales > 0 && (
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Produk Terlaris</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeScope ? activeScope.name : 'Seluruh Indonesia'}
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
                    <p className="sr-only">
                      Produk terlaris adalah {analytics.topProducts[0].productName} dengan{' '}
                      {analytics.topProducts[0].quantitySold} unit terjual.
                    </p>
                    <div className="h-[300px] w-full">
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
                    <div className="mt-4">
                      <table className="w-full table-fixed text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="w-1/2 py-2 font-medium">Produk</th>
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="hidden py-2 text-right font-medium md:table-cell">Transaksi</th>
                            <th className="hidden py-2 text-right font-medium sm:table-cell">Nilai</th>
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
                              <td className="hidden py-2.5 text-right tabular-nums md:table-cell">{item.orderCount}</td>
                              <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{formatCurrency(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{regionLabels[regionLevel]} Pembeli Terbanyak</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeScope ? `Dalam ${activeScope.name}` : 'Seluruh Indonesia'}
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
                    <p className="sr-only">
                      {regionLabels[regionLevel]} dengan pembelian terbanyak adalah{' '}
                      {analytics.topRegions[0].regionName} dengan {analytics.topRegions[0].orderCount} transaksi.
                    </p>
                    <div className="h-[300px] w-full">
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
                    <div className="mt-4">
                      <table className="w-full table-fixed text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="w-1/2 py-2 font-medium">{regionLabels[regionLevel]}</th>
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="hidden py-2 text-right font-medium md:table-cell">Unit</th>
                            <th className="hidden py-2 text-right font-medium sm:table-cell">Nilai</th>
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
                              <td className="hidden py-2.5 text-right tabular-nums md:table-cell">{item.quantityPurchased}</td>
                              <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{formatCurrency(item.revenue)}</td>
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
        </>
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
