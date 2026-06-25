'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useReturns } from '@/lib/hooks/useReturns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, Plus, Search } from 'lucide-react';
import { SaleReturnStatus } from '@/types';

function statusLabel(status: SaleReturnStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Menunggu Review';
    case 'WAITING_ITEM_RETURN':
      return 'Menunggu Barang Kembali';
    case 'ITEM_RECEIVED':
      return 'Barang Diterima';
    case 'REJECTED':
      return 'Ditolak';
    case 'RESTOCKED':
      return 'Masuk Stok';
    case 'DAMAGED':
      return 'Tidak Layak Pakai';
    case 'RESENT':
      return 'Kirim Ulang';
    case 'COMPLETED':
      return 'Selesai';
    default:
      return status;
  }
}

function statusClass(status: SaleReturnStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'WAITING_ITEM_RETURN':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ITEM_RECEIVED':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'RESTOCKED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'DAMAGED':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'RESENT':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    default:
      return '';
  }
}

export default function ReturnsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canCreate = role === 'USER' || role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const returnsQuery = useReturns({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search.trim() || undefined,
  });

  const returnRows = useMemo(() => returnsQuery.data?.data?.returns || [], [returnsQuery.data]);
  const pagination = returnsQuery.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Retur' }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retur Penjualan</h1>
          <p className="mt-1 text-muted-foreground">
            Pengajuan retur dari user dan proses operasional oleh TCP.
          </p>
        </div>
        {canCreate && (
          <Link href="/returns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Buat Retur
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Daftar Retur</CardTitle>
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 md:w-[260px]"
                placeholder="Cari no retur / no pesanan / nama"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING_REVIEW">Menunggu Review</SelectItem>
                <SelectItem value="WAITING_ITEM_RETURN">Menunggu Barang Kembali</SelectItem>
                <SelectItem value="ITEM_RECEIVED">Barang Diterima</SelectItem>
                <SelectItem value="RESTOCKED">Masuk Stok</SelectItem>
                <SelectItem value="DAMAGED">Tidak Layak Pakai</SelectItem>
                <SelectItem value="RESENT">Kirim Ulang</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {returnsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat data retur...
            </div>
          ) : returnRows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Belum ada data retur.</div>
          ) : (
            returnRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{row.returnNumber}</span>
                      <Badge variant="outline" className={statusClass(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      Pesanan: <strong>{row.sale?.saleNumber || '-'}</strong>
                      {' '}• Customer: <strong>{row.sale?.customerName || '-'}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">{row.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Tanggal pengajuan: {new Date(row.requestDate).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/returns/${row.id}`}>
                      <Button variant="outline" size="sm">
                        Detail
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Halaman {pagination?.page || page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || returnsQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || returnsQuery.isFetching}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
