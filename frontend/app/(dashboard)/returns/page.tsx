'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { useReturns } from '@/lib/hooks/useReturns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ComplaintReturnMenu } from '@/components/complaint-return-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSaleReturnStatusBadgeClass, getSaleReturnStatusLabel } from '@/lib/constants/workflowStatus';
import { ArrowRight, Loader2, Plus, Search } from 'lucide-react';
import { SaleReturnStatus } from '@/types';

function statusLabel(status: SaleReturnStatus) {
  return getSaleReturnStatusLabel(status);
}

function statusDescription(status: SaleReturnStatus, isUser: boolean) {
  switch (status) {
    case 'PENDING_REVIEW':
      return isUser
        ? 'Pengajuan retur Anda sudah masuk dan sedang diperiksa tim.'
        : 'Retur baru menunggu keputusan review dari tim internal.';
    case 'WAITING_ITEM_RETURN':
      return isUser
        ? 'Pengajuan disetujui. Tim sedang menunggu barang sampai kembali.'
        : 'Retur disetujui dan menunggu barang diterima secara fisik.';
    case 'ITEM_RECEIVED':
      return isUser
        ? 'Barang sudah diterima tim dan sedang diperiksa kondisinya.'
        : 'Barang sudah diterima dan siap diputuskan hasil inspeksinya.';
    case 'REJECTED':
      return isUser
        ? 'Pengajuan retur tidak dapat diproses. Lihat alasan penolakan di detail.'
        : 'Retur ditolak dan tidak akan dilanjutkan.';
    case 'RESTOCKED':
      return isUser
        ? 'Barang dinyatakan layak dan sudah diterima kembali.'
        : 'Barang hasil retur sudah dimasukkan kembali ke stok.';
    case 'DAMAGED':
      return isUser
        ? 'Barang diterima, tetapi dinyatakan tidak layak pakai.'
        : 'Barang retur dinyatakan rusak dan tidak masuk ke stok jual.';
    case 'RESENT':
      return isUser
        ? 'Barang pengganti sudah diproses untuk dikirim kembali.'
        : 'Barang pengganti sudah diproses untuk pengiriman ulang.';
    case 'COMPLETED':
      return isUser
        ? 'Proses retur sudah selesai.'
        : 'Seluruh proses retur sudah selesai.';
    default:
      return '';
  }
}

function statusClass(status: SaleReturnStatus) {
  return getSaleReturnStatusBadgeClass(status);
}

export default function ReturnsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canCreate = role === 'USER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isUser = role === 'USER';
  const isAdminView = role === 'ADMIN' || role === 'SUPER_ADMIN';

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
            {isUser
              ? 'Lihat riwayat pengajuan retur Anda dan pantau prosesnya langsung dari detail retur.'
              : 'Lihat data retur yang masuk dan proses setiap tahap langsung dari detail retur.'}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Link href="/returns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Buat Retur
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isAdminView && <ComplaintReturnMenu active="returns" />}

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
                <SelectItem value="ITEM_RECEIVED">Barang Sudah Diterima</SelectItem>
                <SelectItem value="RESTOCKED">Masuk Stok</SelectItem>
                <SelectItem value="DAMAGED">Tidak Layak Pakai</SelectItem>
                <SelectItem value="RESENT">Barang Pengganti Dikirim</SelectItem>
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
                    <p className="text-sm text-muted-foreground">{statusDescription(row.status, isUser)}</p>
                    {!isUser && <p className="text-sm text-muted-foreground">{row.reason}</p>}
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
