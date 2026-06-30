'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddReturnTicketMessage,
  useCompleteReturnTicketExecution,
  useFinalizeReturnTicketDecision,
  useMarkReturnTicketAsRead,
  useReturnTicket,
  useStartReturnTicketExecution,
  useUpdateReturnTicketDeadline,
} from '@/lib/hooks/useReturnTickets';
import { useProducts } from '@/lib/hooks/useProducts';
import { useAuthStore } from '@/lib/stores/auth';
import { useSocket } from '@/lib/contexts/SocketContext';
import { notify } from '@/lib/notify';
import { getReturnTicketStatusBadgeClass, getReturnTicketStatusLabel } from '@/lib/constants/workflowStatus';
import { Product, ReturnFinalDecision, ReturnItem, ReturnTicketMessage, ReturnTicketStatus } from '@/types';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';

function statusLabel(status: ReturnTicketStatus, overdue: boolean) {
  return getReturnTicketStatusLabel(status, { overdue });
}

function statusClass(status: ReturnTicketStatus, overdue: boolean) {
  return getReturnTicketStatusBadgeClass(overdue ? 'OVERDUE' : status);
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

function bubbleStyle(message: ReturnTicketMessage, currentUserId?: string) {
  if (message.messageType === 'SYSTEM') return 'bg-muted text-muted-foreground';
  if (message.senderId === currentUserId) return 'bg-primary text-primary-foreground';
  return 'bg-secondary text-secondary-foreground';
}

function stageDescription(status: string, overdue: boolean) {
  if (overdue) return 'Tiket ini melewati batas waktu dan sebaiknya diprioritaskan lebih dulu.';
  switch (status) {
    case 'OPEN':
      return 'Pengajuan retur baru masuk dan menunggu mulai dibahas.';
    case 'IN_DISCUSSION':
      return 'User dan tim internal sedang menyamakan solusi terbaik untuk retur ini.';
    case 'WAITING_TCP_EXECUTION':
      return 'Keputusan sudah final. Tiket tinggal menunggu tindakan dari TCP.';
    case 'TCP_EXECUTING':
      return 'TCP sedang menjalankan keputusan yang sudah disepakati di forum tiket.';
    case 'COMPLETED':
      return 'Semua proses tiket sudah selesai, termasuk tindakan operasionalnya.';
    default:
                return 'Tiket retur ini sedang berjalan.';
  }
}

type ExecutionItemForm = {
  returnItemId: string;
  qtyReceived: string;
  replacementQty: string;
  replacementProductId: string;
  replacementVariantName: string;
};

function getProductVariants(product?: Product | null) {
  if (!product) return [];
  return product.variantItems || product.variants || [];
}

export default function ReturnTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isTcp = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const currentUserId = user?.id;

  const ticketQuery = useReturnTicket(params.id);
  const markAsReadMutation = useMarkReturnTicketAsRead();
  const addMessageMutation = useAddReturnTicketMessage();
  const updateDeadlineMutation = useUpdateReturnTicketDeadline();
  const finalizeDecisionMutation = useFinalizeReturnTicketDecision();
  const startExecutionMutation = useStartReturnTicketExecution();
  const completeExecutionMutation = useCompleteReturnTicketExecution();
  const { data: productsData } = useProducts({ limit: 200 }, { enabled: isTcp });

  const [message, setMessage] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [decision, setDecision] = useState<ReturnFinalDecision>('RESEND_UNIT');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [executionNotes, setExecutionNotes] = useState('');
  const [shippingService, setShippingService] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [executionItems, setExecutionItems] = useState<ExecutionItemForm[]>([]);

  const ticket = ticketQuery.data?.data;
  const overdue = !!ticket && new Date(ticket.deadlineAt).getTime() < Date.now() && !['COMPLETED', 'REJECTED'].includes(ticket.status);
  const latestExecution = ticket?.executions?.[ticket.executions.length - 1];
  const products = useMemo(() => productsData?.data?.products || [], [productsData]);
  const totalShippingCost = Number(latestExecution?.shippingCost || 0);
  const totalExtraCost = Number(latestExecution?.expenseAmount || 0);
  const totalCostImpact = totalShippingCost + totalExtraCost;

  useEffect(() => {
    if (ticket?.deadlineAt) {
      const date = new Date(ticket.deadlineAt);
      const pad = (value: number) => String(value).padStart(2, '0');
      const localValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      setDeadlineAt(localValue);
    }
    if (ticket?.finalDecision) {
      setDecision(ticket.finalDecision);
    }
    if (ticket?.finalDecisionNotes) {
      setDecisionNotes(ticket.finalDecisionNotes);
    }
    if (latestExecution?.notes) setExecutionNotes(latestExecution.notes);
    if (latestExecution?.shippingService) setShippingService(latestExecution.shippingService);
    if (latestExecution?.shippingCost) setShippingCost(String(latestExecution.shippingCost));
    if (latestExecution?.expenseAmount) setExpenseAmount(String(latestExecution.expenseAmount));
    if (ticket?.returnRecord?.items) {
      setExecutionItems(
        ticket.returnRecord.items.map((item) => ({
          returnItemId: item.id,
          qtyReceived: String(item.qtyReceived ?? item.qtyRequested ?? 0),
          replacementQty: String(item.replacementQty ?? item.qtyRequested ?? 0),
          replacementProductId: item.replacementProductId || item.productId,
          replacementVariantName: item.replacementVariantName || item.variantName || '',
        }))
      );
    }
  }, [ticket?.deadlineAt, ticket?.finalDecision, ticket?.finalDecisionNotes, ticket?.returnRecord?.items, latestExecution?.notes, latestExecution?.shippingService, latestExecution?.shippingCost, latestExecution?.expenseAmount]);

  useEffect(() => {
    if (!socket || !params.id) return;
    const room = `return-ticket:${params.id}`;
    socket.emit('room:join', room);

    const refetch = () => {
      void ticketQuery.refetch();
    };

    socket.on('return-ticket:message:new', refetch);
    socket.on('return-ticket:updated', refetch);
    socket.on('return-ticket:deadline:updated', refetch);
    socket.on('return-ticket:decision:finalized', refetch);
    socket.on('return-ticket:execution:started', refetch);
    socket.on('return-ticket:execution:completed', refetch);

    return () => {
      socket.emit('room:leave', room);
      socket.off('return-ticket:message:new', refetch);
      socket.off('return-ticket:updated', refetch);
      socket.off('return-ticket:deadline:updated', refetch);
      socket.off('return-ticket:decision:finalized', refetch);
      socket.off('return-ticket:execution:started', refetch);
      socket.off('return-ticket:execution:completed', refetch);
    };
  }, [socket, params.id, ticketQuery]);

  useEffect(() => {
    if (!ticket?.id || ticketQuery.isLoading || markAsReadMutation.isPending) return;
    markAsReadMutation.mutate(ticket.id);
  }, [ticket?.id, ticket?.messages?.length, ticket?.status, ticketQuery.isLoading]);

  const messageCount = ticket?.messages?.length || 0;
  const participantCount = ticket?.participants?.length || 0;

  const canSendMessage = message.trim().length > 0 && !addMessageMutation.isPending;
  const canFinalizeDecision = isAdmin && ['OPEN', 'IN_DISCUSSION', 'DECISION_FINALIZED'].includes(ticket?.status || '');
  const canStartExecution = isTcp && ticket?.status === 'WAITING_TCP_EXECUTION';
  const canCompleteExecution = isTcp && ticket?.status === 'TCP_EXECUTING';

  const participantsLabel = useMemo(
    () => (ticket?.participants || []).map((participant) => participant.user?.fullName || participant.user?.username || participant.roleSnapshot).join(', '),
    [ticket?.participants]
  );

  const returnItems = ticket?.returnRecord?.items || [];

  const updateExecutionItem = (returnItemId: string, patch: Partial<ExecutionItemForm>) => {
    setExecutionItems((prev) =>
      prev.map((item) => (item.returnItemId === returnItemId ? { ...item, ...patch } : item))
    );
  };

  const getExecutionItemForm = (returnItemId: string) =>
    executionItems.find((item) => item.returnItemId === returnItemId);

  const buildExecutionPayload = () => {
    return returnItems.map((item: ReturnItem) => {
      const form = getExecutionItemForm(item.id);
      const qtyReceived = Number(form?.qtyReceived || 0);
      const replacementQty = Number(form?.replacementQty || qtyReceived);

      if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > item.qtyRequested) {
        throw new Error(`Qty diterima untuk ${item.product?.name || 'item retur'} tidak valid`);
      }

      if (ticket?.finalDecision !== 'RESTOCK') {
        if (!Number.isInteger(replacementQty) || replacementQty <= 0) {
          throw new Error(`Qty pengganti / komponen untuk ${item.product?.name || 'item retur'} tidak valid`);
        }
      }

      return {
        returnItemId: item.id,
        qtyReceived,
        replacementQty: ticket?.finalDecision === 'RESTOCK' ? undefined : replacementQty,
        replacementProductId:
          ticket?.finalDecision === 'RESTOCK' ? undefined : form?.replacementProductId || item.productId,
        replacementVariantName:
          ticket?.finalDecision === 'RESTOCK'
            ? undefined
            : (form?.replacementVariantName || '').trim() || null,
      };
    });
  };

  if (ticketQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memuat detail tiket retur...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Tiket Retur', href: '/return-tickets' }, { label: 'Detail' }]} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tiket retur tidak ditemukan.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Tiket Retur', href: '/return-tickets' }, { label: ticket.ticketNumber }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{ticket.ticketNumber}</h1>
            <Badge variant="outline" className={statusClass(ticket.status, overdue)}>
              {statusLabel(ticket.status, overdue)}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Retur {ticket.returnRecord?.returnNumber || '-'} • Pesanan {ticket.returnRecord?.sale?.saleNumber || '-'}
          </p>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {stageDescription(ticket.status, overdue)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/return-tickets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          <Link href={`/returns/${ticket.saleReturnId}`}>
            <Button variant="outline">Lihat Data Retur</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Pesan</p>
              <p className="text-2xl font-bold">{messageCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Peserta Tiket</p>
              <p className="text-2xl font-bold">{participantCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Clock3 className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">Keputusan</p>
              <p className="text-sm font-semibold">{decisionLabel(ticket.finalDecision)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Truck className="h-8 w-8 text-cyan-700" />
            <div>
              <p className="text-sm text-muted-foreground">Dampak Biaya</p>
              <p className="text-sm font-semibold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCostImpact)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Forum Tiket Retur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-4">
                {(ticket.messages || []).length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Belum ada percakapan di tiket ini.</div>
                ) : (
                  (ticket.messages || []).map((item) => (
                    <div
                      key={item.id}
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                        bubbleStyle(item, currentUserId)
                      } ${item.senderId === currentUserId ? 'ml-auto' : ''}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-80">
                        <span>{item.sender?.fullName || (item.messageType === 'SYSTEM' ? 'Sistem' : 'Peserta')}</span>
                        <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{item.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <Label>Kirim Pesan</Label>
                <Textarea
                  rows={4}
                  placeholder="Tulis balasan atau update progres tiket di sini"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={!canSendMessage}
                    onClick={() => {
                      addMessageMutation.mutate(
                        { id: ticket.id, data: { message: message.trim() } },
                        {
                          onSuccess: () => {
                            setMessage('');
                          },
                        }
                      );
                    }}
                  >
                    {addMessageMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Kirim Pesan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
            <CardTitle>Ringkasan Tiket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
              <p>Customer: <strong>{ticket.returnRecord?.sale?.customerName || '-'}</strong></p>
              <p>Alasan retur: <strong>{ticket.returnRecord?.reason || '-'}</strong></p>
              <p>Peserta: <span className="text-muted-foreground">{participantsLabel || '-'}</span></p>
              <p>Batas Waktu: <strong>{new Date(ticket.deadlineAt).toLocaleString('id-ID')}</strong></p>
              <p>Keputusan akhir: <strong>{decisionLabel(ticket.finalDecision)}</strong></p>
              <p>
                Tahap sekarang:{' '}
                <Badge variant="outline" className={statusClass(ticket.status, overdue)}>
                  {statusLabel(ticket.status, overdue)}
                </Badge>
              </p>
              {ticket.finalDecisionNotes && (
                <p>Catatan keputusan: <span className="text-muted-foreground">{ticket.finalDecisionNotes}</span></p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Biaya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Biaya kirim</span>
                <strong>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalShippingCost)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Biaya tambahan</span>
                <strong>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalExtraCost)}
                </strong>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Total dampak biaya</span>
                <strong>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCostImpact)}
                </strong>
              </div>
              <p className="text-xs text-muted-foreground">
                Ringkasan ini membantu tim melihat biaya yang muncul dari penanganan retur.
              </p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Atur Batas Waktu Tiket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="deadlineAt">Batas waktu penyelesaian</Label>
                <Input
                  id="deadlineAt"
                  type="datetime-local"
                  value={deadlineAt}
                  onChange={(event) => setDeadlineAt(event.target.value)}
                />
                <Button
                  disabled={!deadlineAt || updateDeadlineMutation.isPending}
                  onClick={() =>
                    updateDeadlineMutation.mutate({
                      id: ticket.id,
                      data: { deadlineAt: new Date(deadlineAt).toISOString() },
                    })
                  }
                >
                  {updateDeadlineMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  )}
                  Simpan Batas Waktu
                </Button>
              </CardContent>
            </Card>
          )}

          {canFinalizeDecision && (
            <Card>
              <CardHeader>
                <CardTitle>Finalisasi Keputusan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Keputusan Akhir</Label>
                <div className="grid gap-2">
                  {[
                    { value: 'RESEND_UNIT', label: 'Kirim Ulang Unit Baru' },
                    { value: 'SEND_COMPONENT', label: 'Kirim Komponen' },
                    { value: 'RESTOCK', label: 'Kembali ke Stok' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        decision === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                      onClick={() => setDecision(option.value as ReturnFinalDecision)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Catatan Keputusan</Label>
                  <Textarea
                    rows={3}
                    placeholder="Contoh: kirim unit pengganti baru karena unit awal cacat"
                    value={decisionNotes}
                    onChange={(event) => setDecisionNotes(event.target.value)}
                  />
                </div>
                <Button
                  disabled={finalizeDecisionMutation.isPending}
                  onClick={() =>
                    finalizeDecisionMutation.mutate({
                      id: ticket.id,
                      data: {
                        finalDecision: decision,
                        finalDecisionNotes: decisionNotes.trim() || undefined,
                      },
                    })
                  }
                >
                  {finalizeDecisionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Finalisasi Keputusan
                </Button>
              </CardContent>
            </Card>
          )}

          {canStartExecution && (
            <Card>
              <CardHeader>
                <CardTitle>Mulai Eksekusi TCP</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => startExecutionMutation.mutate({ id: ticket.id })}
                  disabled={startExecutionMutation.isPending}
                >
                  {startExecutionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="mr-2 h-4 w-4" />
                  )}
                  Mulai Eksekusi
                </Button>
              </CardContent>
            </Card>
          )}

          {canCompleteExecution && (
            <Card>
              <CardHeader>
                <CardTitle>Selesaikan Eksekusi TCP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  Lengkapi detail item yang benar-benar diterima dan barang/komponen yang benar-benar dikirim, agar stok dan biaya tercatat sesuai kenyataan.
                </div>
                <div className="space-y-3">
                  <Label>Detail Item Eksekusi</Label>
                  {returnItems.map((item: ReturnItem) => {
                    const form = getExecutionItemForm(item.id);
                    const selectedProduct =
                      products.find((product) => product.id === (form?.replacementProductId || item.productId)) || item.product;
                    const variants = getProductVariants(selectedProduct);

                    return (
                      <div key={item.id} className="rounded-xl border p-3 space-y-3">
                        <div>
                          <p className="font-medium">{item.product?.name || item.saleItem?.product?.name || item.productId}</p>
                          <p className="text-xs text-muted-foreground">
                            Diminta retur: {item.qtyRequested}
                            {item.variantName ? ` • Varian asal: ${item.variantName}` : ''}
                          </p>
                        </div>

                        <div className={`grid gap-3 ${ticket.finalDecision === 'RESTOCK' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                          <div className="space-y-2">
                            <Label>Qty diterima</Label>
                            <Input
                              type="number"
                              min="1"
                              max={item.qtyRequested}
                              value={form?.qtyReceived || ''}
                              onChange={(event) =>
                                updateExecutionItem(item.id, { qtyReceived: event.target.value })
                              }
                            />
                          </div>

                          {ticket.finalDecision !== 'RESTOCK' && (
                            <div className="space-y-2">
                              <Label>Qty dikirim</Label>
                              <Input
                                type="number"
                                min="1"
                                value={form?.replacementQty || ''}
                                onChange={(event) =>
                                  updateExecutionItem(item.id, { replacementQty: event.target.value })
                                }
                              />
                            </div>
                          )}
                        </div>

                        {ticket.finalDecision !== 'RESTOCK' && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{ticket.finalDecision === 'SEND_COMPONENT' ? 'Pilih komponen' : 'Pilih unit pengganti'}</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={form?.replacementProductId || item.productId}
                                onChange={(event) =>
                                  updateExecutionItem(item.id, {
                                    replacementProductId: event.target.value,
                                    replacementVariantName: '',
                                  })
                                }
                              >
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} • Stok {product.stock}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label>Varian</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={form?.replacementVariantName || ''}
                                onChange={(event) =>
                                  updateExecutionItem(item.id, { replacementVariantName: event.target.value })
                                }
                              >
                                <option value="">Tanpa varian khusus</option>
                                {variants.map((variant) => (
                                  <option key={variant.id} value={variant.value}>
                                    {variant.value} • Stok {variant.stock}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label>Catatan Eksekusi</Label>
                  <Textarea
                    rows={3}
                    value={executionNotes}
                    onChange={(event) => setExecutionNotes(event.target.value)}
                    placeholder="Contoh: unit baru sudah dikirim dan resi sudah dibagikan"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Jasa Pengiriman</Label>
                    <Input
                      value={shippingService}
                      onChange={(event) => setShippingService(event.target.value)}
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Biaya Kirim</Label>
                    <Input
                      type="number"
                      min="0"
                      value={shippingCost}
                      onChange={(event) => setShippingCost(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nominal Biaya Lain</Label>
                  <Input
                    type="number"
                    min="0"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                  />
                </div>
                <Button
                  disabled={completeExecutionMutation.isPending}
                  onClick={() => {
                    const nextShippingCost = Number(shippingCost || 0);
                    const nextExpenseAmount = Number(expenseAmount || 0);
                    if (Number.isNaN(nextShippingCost) || Number.isNaN(nextExpenseAmount)) {
                      notify.error('Nominal biaya harus berupa angka');
                      return;
                    }
                    let items;
                    try {
                      items = buildExecutionPayload();
                    } catch (error) {
                      notify.error(error instanceof Error ? error.message : 'Detail item eksekusi belum valid');
                      return;
                    }
                    completeExecutionMutation.mutate({
                      id: ticket.id,
                      data: {
                        notes: executionNotes.trim() || undefined,
                        shippingService: shippingService.trim() || undefined,
                        shippingCost: nextShippingCost,
                        expenseAmount: nextExpenseAmount,
                        items,
                      },
                    });
                  }}
                >
                  {completeExecutionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Selesaikan Eksekusi
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
