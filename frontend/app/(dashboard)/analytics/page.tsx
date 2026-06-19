'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Boxes, MapPin, ReceiptText } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonChart, SkeletonCard } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useSalesAnalytics } from '@/lib/hooks/useAnalytics';

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
};

export default function AnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(() => today.toISOString().slice(0, 10));
  const [regionLevel, setRegionLevel] = useState<keyof typeof regionLabels>('province');

  const analyticsQuery = useSalesAnalytics({
    startDate,
    endDate,
    regionLevel,
    limit: 10,
  });

  const analytics = analyticsQuery.data?.data;
  const maxProductQuantity = Math.max(...(analytics?.topProducts.map((item) => item.quantitySold) || [0]), 1);
  const maxRegionOrders = Math.max(...(analytics?.topRegions.map((item) => item.orderCount) || [0]), 1);

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumbs items={[{ label: 'Analisa' }]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analisa Penjualan</h1>
        <p className="mt-1 text-muted-foreground">
          Perbandingan produk terlaris dan persebaran wilayah pembeli.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-y py-5 md:grid-cols-3">
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
        <div className="space-y-2">
          <Label>Tingkat Wilayah</Label>
          <Select
            value={regionLevel}
            onValueChange={(value) => setRegionLevel(value as keyof typeof regionLabels)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(regionLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      <p className="text-sm text-muted-foreground">Data Berwilayah</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{analytics.summary.mappedSales}</p>
                    </div>
                    <MapPin className="h-6 w-6 text-info" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Cakupan Wilayah</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{analytics.summary.mappingCoverage}%</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.summary.unmappedSales} data lama belum terpetakan
                      </p>
                    </div>
                    <Boxes className="h-6 w-6 text-warning" />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
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
                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.topProducts}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                          <XAxis type="number" domain={[0, maxProductQuantity]} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="productName"
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
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
                          <Bar dataKey="quantitySold" name="Terjual" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 font-medium">Produk</th>
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="py-2 text-right font-medium">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topProducts.map((item) => (
                            <tr key={item.productId} className="border-b last:border-0">
                              <td className="py-2.5">
                                <div className="font-medium">{item.productName}</div>
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

            <Card>
              <CardHeader>
                <CardTitle>Wilayah Pembeli Terbanyak</CardTitle>
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
                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.topRegions}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                          <XAxis type="number" domain={[0, maxRegionOrders]} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="regionName"
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} transaksi`, 'Pembelian']}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <Bar dataKey="orderCount" name="Pembelian" fill="var(--success)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 font-medium">{regionLabels[regionLevel]}</th>
                            <th className="py-2 text-right font-medium">Transaksi</th>
                            <th className="py-2 text-right font-medium">Unit</th>
                            <th className="py-2 text-right font-medium">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topRegions.map((item) => (
                            <tr key={item.regionId} className="border-b last:border-0">
                              <td className="py-2.5 font-medium">{item.regionName}</td>
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
          </div>
        </>
      )}
    </div>
  );
}
