'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores/auth';
import { useReturnTickets } from '@/lib/hooks/useReturnTickets';
import { getReturnTicketStatusBadgeClass, getReturnTicketStatusLabel } from '@/lib/constants/workflowStatus';
import { ReturnFinalDecision, ReturnTicket, ReturnTicketStatus } from '@/types';
import { AlertCircle, ArrowRight, Clock3, Loader2, MessageSquare, Search, TimerReset } from 'lucide-react';

function statusClass(status: ReturnTicketStatus) {
  return getReturnTicketStatusBadgeClass(status);
}

function decisionLabel(decision?: ReturnFinalDecision | null) {
  switch (decision) {
    case 'RESEND_UNIT':
      return 'Kirim Ulang Barang';
    case 'SEND_COMPONENT':
      return 'Kirim Komponen';
    case 'RESTOCK':
      return 'Kembali ke Stok';
    default:
      return 'Belum Diputuskan';
  }
}

function isOverdue(ticket: ReturnTicket) {
  return new Date(ticket.deadlineAt).getTime() < Date.now() && !['COMPLETED', 'REJECTED'].includes(ticket.status);
}

export default function ReturnTicketsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const isUser = role === 'USER';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const ticketsQuery = useReturnTickets({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search.trim() || undefined,
    overdue: overdueOnly || undefined,
  });

  const tickets = useMemo(() => ticketsQuery.data?.data?.tickets || [], [ticketsQuery.data]);
  const pagination = ticketsQuery.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const summary = useMemo(() => {
    const overdue = tickets.filter(isOverdue).length;
    const waitingTcp = tickets.filter((ticket) => ticket.status === 'WAITING_TCP_EXECUTION').length;
    const active = tickets.filter((ticket) => !['COMPLETED', 'REJECTED'].includes(ticket.status)).length;
    return { overdue, waitingTcp, active };
  }, [tickets]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Tiket Retur' }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tiket Retur</h1>
          <p className="mt-1 text-muted-foreground">
            {isUser
              ? 'Pantau diskusi retur Anda, balas pesan, dan lihat keputusan akhirnya.'
              : 'Kelola forum retur, tetapkan keputusan, dan teruskan ke TCP untuk dieksekusi.'}
          </p>
        </div>
        <Link href="/returns/new">
          <Button>Buat Pengajuan Retur</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tiket Aktif</p>
              <p className="text-2xl font-bold">{summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Clock3 className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Eksekusi TCP</p>
              <p className="text-2xl font-bold">{summary.waitingTcp}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Melewati Deadline</p>
              <p className="text-2xl font-bold">{summary.overdue}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Daftar Tiket Retur</CardTitle>
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 md:w-[260px]"
                placeholder="Cari no tiket / retur / pesanan"
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
              <SelectTrigger className="md:w-[230px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="OPEN">Baru Dibuka</SelectItem>
                <SelectItem value="IN_DISCUSSION">Dalam Diskusi</SelectItem>
                <SelectItem value="DECISION_FINALIZED">Keputusan Sudah Final</SelectItem>
                <SelectItem value="WAITING_TCP_EXECUTION">Menunggu Eksekusi TCP</SelectItem>
                <SelectItem value="TCP_EXECUTING">Sedang Dieksekusi TCP</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={overdueOnly ? 'default' : 'outline'}
              onClick={() => {
                setOverdueOnly((prev) => !prev);
                setPage(1);
              }}
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Overdue
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticketsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat tiket retur...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Belum ada tiket retur.</div>
          ) : (
            tickets.map((ticket) => {
              const overdue = isOverdue(ticket);

              return (
                <div key={ticket.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{ticket.ticketNumber}</span>
                        <Badge variant="outline" className={statusClass(overdue ? 'OVERDUE' : ticket.status)}>
                          {getReturnTicketStatusLabel(overdue ? 'OVERDUE' : ticket.status, { overdue })}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        Retur: <strong>{ticket.returnRecord?.returnNumber || '-'}</strong> • Pesanan:{' '}
                        <strong>{ticket.returnRecord?.sale?.saleNumber || '-'}</strong>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Customer: {ticket.returnRecord?.sale?.customerName || '-'} • Keputusan: {decisionLabel(ticket.finalDecision)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Batas Waktu: {new Date(ticket.deadlineAt).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {overdue
                          ? 'Tiket ini sudah melewati batas waktu dan perlu diprioritaskan.'
                          : ticket.status === 'WAITING_TCP_EXECUTION'
                            ? 'Diskusi sudah selesai dan tiket menunggu tindakan TCP.'
                            : ticket.status === 'TCP_EXECUTING'
                              ? 'TCP sedang menjalankan keputusan yang sudah disepakati.'
                              : 'Semua percakapan dan keputusan retur tersimpan di tiket ini.'}
                      </p>
                    </div>
                    <Link href={`/return-tickets/${ticket.id}`}>
                      <Button variant="outline" size="sm">
                        Buka Tiket
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Halaman {pagination?.page || page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || ticketsQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || ticketsQuery.isFetching}
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
