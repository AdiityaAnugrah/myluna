'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import {
  useReceiveReturn,
  useReturn,
  useReviewReturn,
} from '@/lib/hooks/useReturns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getReturnTicketStatusBadgeClass,
  getReturnTicketStatusLabel,
  getSaleReturnStatusBadgeClass,
  getSaleReturnStatusLabel,
} from '@/lib/constants/workflowStatus';
import { getImageUrl } from '@/lib/utils/url';
import { Loader2 } from 'lucide-react';
import { SaleReturnStatus } from '@/types';

function statusLabel(status: SaleReturnStatus) {
  return getSaleReturnStatusLabel(status);
}

function statusClass(status: SaleReturnStatus) {
  return getSaleReturnStatusBadgeClass(status);
}

function statusDescription(status: string, isUser: boolean) {
  switch (status) {
    case 'PENDING_REVIEW':
      return isUser
        ? 'Tim sedang memeriksa pengajuan retur Anda.'
        : 'Pengajuan baru masuk dan perlu keputusan review.';
    case 'WAITING_ITEM_RETURN':
      return isUser
        ? 'Pengajuan disetujui. Barang perlu sampai kembali ke tim terlebih dahulu.'
        : 'Retur sudah disetujui dan menunggu barang diterima secara fisik.';
    case 'ITEM_RECEIVED':
      return isUser
        ? 'Barang sudah diterima tim dan sedang diperiksa kondisinya.'
        : 'Barang sudah diterima dan menunggu keputusan inspeksi.';
    case 'REJECTED':
      return isUser
        ? 'Pengajuan retur tidak dapat dilanjutkan.'
        : 'Retur sudah ditolak dan tidak akan diproses lebih lanjut.';
    case 'RESTOCKED':
      return isUser
        ? 'Barang retur dinyatakan layak dan sudah diterima kembali.'
        : 'Barang hasil retur sudah masuk kembali ke stok.';
    case 'DAMAGED':
      return isUser
        ? 'Barang diterima, tetapi dinyatakan tidak layak pakai.'
        : 'Barang retur dinyatakan rusak dan dicatat sebagai dampak kerugian.';
    case 'RESENT':
      return isUser
        ? 'Barang pengganti sudah diproses untuk dikirim ulang.'
        : 'Barang pengganti sudah diproses untuk pengiriman ulang.';
    case 'COMPLETED':
      return isUser ? 'Seluruh proses retur sudah selesai.' : 'Proses retur selesai.';
    default:
      return '';
  }
}

function progressLabel(status: string) {
  switch (status) {
    case 'PENDING_REVIEW':
      return '1 dari 4 langkah selesai';
    case 'WAITING_ITEM_RETURN':
      return '2 dari 4 langkah selesai';
    case 'ITEM_RECEIVED':
      return '3 dari 4 langkah selesai';
    case 'RESTOCKED':
    case 'DAMAGED':
    case 'RESENT':
    case 'COMPLETED':
      return '4 dari 4 langkah selesai';
    case 'REJECTED':
      return 'Proses berhenti di tahap review';
    default:
      return '';
  }
}

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const canProcess = role === 'TCP' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isUser = role === 'USER';

  const returnQuery = useReturn(params.id);
  const reviewMutation = useReviewReturn();
  const receiveMutation = useReceiveReturn();

  const returnData = returnQuery.data?.data;
  const returnItems = returnData?.items || [];

  const [rejectionReason, setRejectionReason] = useState('');
  const [receivedPhotos, setReceivedPhotos] = useState<File[]>([]);
  if (returnQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memuat detail retur...
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: 'Detail' }]} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Data retur tidak ditemukan.
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticketHref = returnData.ticket ? `/return-tickets/${returnData.ticket.id}` : '/return-tickets';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Retur', href: '/returns' }, { label: returnData.returnNumber }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{returnData.returnNumber}</h1>
          <p className="mt-1 text-muted-foreground">
            Pesanan {returnData.sale?.saleNumber || '-'} • {returnData.sale?.customerName || '-'}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/returns')}>
          Kembali
        </Button>
      </div>

      {returnData.ticket && (
        <Card>
          <CardHeader>
            <CardTitle>Tiket Retur Terkait</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <p className="font-medium">{returnData.ticket.ticketNumber}</p>
              <p className="text-muted-foreground">
                Status tiket:{' '}
                <Badge
                  variant="outline"
                  className={getReturnTicketStatusBadgeClass(returnData.ticket.status)}
                >
                  {getReturnTicketStatusLabel(returnData.ticket.status)}
                </Badge>
              </p>
            </div>
            <Link href={ticketHref}>
              <Button>Lihat Tiket Retur</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isUser ? 'Status Retur Anda' : 'Ringkasan Retur'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Status:{' '}
            <Badge variant="outline" className={statusClass(returnData.status)}>
              {statusLabel(returnData.status)}
            </Badge>
          </p>
          <p className="text-muted-foreground">{statusDescription(returnData.status, isUser)}</p>
          <p className="text-xs text-muted-foreground">{progressLabel(returnData.status)}</p>
          <p>Alasan: {returnData.reason}</p>
          <p>Tanggal Pengajuan: {new Date(returnData.requestDate).toLocaleDateString('id-ID')}</p>
          {returnData.rejectionReason && <p>Alasan Ditolak: {returnData.rejectionReason}</p>}
          {returnData.inspectionDecision && !isUser && <p>Keputusan Akhir: {returnData.inspectionDecision}</p>}
          {returnData.inspectionNotes && <p>Catatan Inspeksi: {returnData.inspectionNotes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item Retur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {returnItems.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{item.product?.name || item.productId}</p>
              <p className="text-muted-foreground">
                Qty jual: {item.qtySold} • Qty retur: {item.qtyRequested}
                {item.variantName ? ` • Varian: ${item.variantName}` : ''}
              </p>
              {item.replacementProduct && (
                <p className="text-muted-foreground">
                  Pengganti: {item.replacementProduct.name} • Qty {item.replacementQty}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {(returnData.evidencePhotos || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isUser ? 'Foto Bukti yang Anda Kirim' : 'Foto Bukti User'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(returnData.evidencePhotos || []).map((photo) => (
              <a key={photo} href={getImageUrl(photo)} target="_blank" rel="noreferrer">
                <img src={getImageUrl(photo)} alt="Bukti retur" className="h-28 w-28 rounded-md border object-cover" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {canProcess && returnData.status === 'PENDING_REVIEW' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Tim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alasan Penolakan</Label>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Isi jika ingin menolak retur"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => reviewMutation.mutate({ id: returnData.id, data: { action: 'APPROVE' } })}
                disabled={reviewMutation.isPending}
              >
                Setujui Pengajuan
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  reviewMutation.mutate({
                    id: returnData.id,
                    data: { action: 'REJECT', rejectionReason },
                  })
                }
                disabled={reviewMutation.isPending || rejectionReason.trim().length < 5}
              >
                Tolak Pengajuan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canProcess && returnData.status === 'WAITING_ITEM_RETURN' && (
        <Card>
          <CardHeader>
            <CardTitle>Konfirmasi Barang Sudah Sampai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Foto Barang Diterima</Label>
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(event) => setReceivedPhotos(Array.from(event.target.files || []))}
              />
            </div>
            <Button
              onClick={() => {
                const formData = new FormData();
                receivedPhotos.forEach((photo) => formData.append('receivedPhotos', photo));
                receiveMutation.mutate({ id: returnData.id, data: formData });
              }}
              disabled={receiveMutation.isPending}
            >
              Tandai Barang Sudah Diterima
            </Button>
          </CardContent>
        </Card>
      )}

      {canProcess && returnData.status === 'ITEM_RECEIVED' && (
        <Card>
          <CardHeader>
            <CardTitle>Keputusan Setelah Pengecekan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Barang sudah diterima. Diskusi keputusan akhir, finalisasi keputusan, dan eksekusi TCP sekarang dipusatkan di Tiket Retur agar tidak ada keputusan ganda.
            </p>
            <Link href={ticketHref}>
              <Button>Lanjut ke Tiket Retur</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
