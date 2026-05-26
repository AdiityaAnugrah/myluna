'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import {
  useComplaints,
  useCreateComplaint,
  useEligibleComplaintSales,
  useReviewComplaint,
  useShipComplaintReplacement,
} from '@/lib/hooks/useComplaints';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getImageUrl } from '@/lib/utils/url';
import { Complaint, ComplaintStatus, Sale } from '@/types';
import { CheckCircle2, FileText, Loader2, Search, Send, Upload, XCircle } from 'lucide-react';

function statusLabel(status: ComplaintStatus) {
  switch (status) {
    case 'PENDING_TCP_REVIEW':
      return 'Menunggu Review TCP';
    case 'REJECTED_BY_TCP':
      return 'Ditolak TCP';
    case 'ACCEPTED_BY_TCP':
      return 'Diterima TCP';
    case 'REPLACEMENT_SHIPPED':
      return 'Pesanan Komplen Sedang Dikirim';
    default:
      return status;
  }
}

function statusBadgeClass(status: ComplaintStatus) {
  switch (status) {
    case 'PENDING_TCP_REVIEW':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'REJECTED_BY_TCP':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'ACCEPTED_BY_TCP':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'REPLACEMENT_SHIPPED':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return '';
  }
}

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const isUser = role === 'USER';
  const isTcp = role === 'TCP';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canCreate = isUser || isSuperAdmin;
  const canTcpReview = isTcp || isSuperAdmin;

  const today = new Date().toISOString().split('T')[0];

  // Create form state
  const [saleQuery, setSaleQuery] = useState('');
  const [debouncedSaleQuery, setDebouncedSaleQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reason, setReason] = useState('');
  const [complaintDate, setComplaintDate] = useState(today);
  const [complaintPhoto, setComplaintPhoto] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // List state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // TCP actions state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [replacementProof, setReplacementProof] = useState<File | null>(null);

  const createComplaint = useCreateComplaint();
  const reviewComplaint = useReviewComplaint();
  const shipComplaint = useShipComplaintReplacement();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSaleQuery(saleQuery), 350);
    return () => clearTimeout(t);
  }, [saleQuery]);

  const eligibleSalesQuery = useEligibleComplaintSales(debouncedSaleQuery, {
    enabled: canCreate,
  });

  const complaintsQuery = useComplaints({
    page: 1,
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchFilter || undefined,
  });

  const complaints: Complaint[] = useMemo(
    () => complaintsQuery.data?.data?.complaints ?? [],
    [complaintsQuery.data]
  );
  const eligibleSales: Sale[] = useMemo(
    () => eligibleSalesQuery.data?.data ?? [],
    [eligibleSalesQuery.data]
  );
  const effectiveComplaintDate = isUser ? today : complaintDate;

  const selectedSaleStillExists = useMemo(() => {
    if (!selectedSale) return false;
    return eligibleSales.some((s) => s.id === selectedSale.id) || saleQuery.trim().length === 0;
  }, [selectedSale, eligibleSales, saleQuery]);

  const canSubmitComplaint =
    !!selectedSale &&
    !!complaintPhoto &&
    reason.trim().length >= 5 &&
    !!effectiveComplaintDate &&
    selectedSaleStillExists &&
    !createComplaint.isPending;

  const openPreview = () => {
    if (!canSubmitComplaint) return;
    setPreviewOpen(true);
  };

  const submitComplaint = () => {
    if (!selectedSale || !complaintPhoto) return;
    const formData = new FormData();
    formData.append('saleId', selectedSale.id);
    formData.append('reason', reason.trim());
    formData.append('complaintDate', effectiveComplaintDate);
    formData.append('complaintPhoto', complaintPhoto);

    createComplaint.mutate(formData, {
      onSuccess: () => {
        setPreviewOpen(false);
        setSelectedSale(null);
        setReason('');
        setComplaintDate(today);
        setComplaintPhoto(null);
        setSaleQuery('');
        setDebouncedSaleQuery('');
      },
    });
  };

  const openRejectDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!selectedComplaint || rejectReason.trim().length < 5) return;
    reviewComplaint.mutate(
      {
        id: selectedComplaint.id,
        decision: 'REJECT',
        rejectionReason: rejectReason.trim(),
      },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedComplaint(null);
          setRejectReason('');
        },
      }
    );
  };

  const openShipDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setReplacementProof(null);
    setShipDialogOpen(true);
  };

  const confirmShip = () => {
    if (!selectedComplaint || !replacementProof) return;
    const formData = new FormData();
    formData.append('replacementProof', replacementProof);
    shipComplaint.mutate(
      { id: selectedComplaint.id, data: formData },
      {
        onSuccess: () => {
          setShipDialogOpen(false);
          setSelectedComplaint(null);
          setReplacementProof(null);
        },
      }
    );
  };

  const previewPhotoUrl = complaintPhoto ? URL.createObjectURL(complaintPhoto) : '';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan' }, { label: 'Komplen' }]} />

      <div>
        <h1 className="text-3xl font-bold">Komplen Pesanan</h1>
        <p className="text-muted-foreground mt-1">
          Input, review, dan tracking status komplen pesanan pengganti.
        </p>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Buat Komplen Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cari Pesanan (Nama / No Resi Saat Ini)</Label>
              <Input
                placeholder="Contoh: INV-2026-001 atau nama pelanggan"
                value={saleQuery}
                onChange={(e) => setSaleQuery(e.target.value)}
              />
              {saleQuery.trim().length >= 2 && (
                <div className="rounded-md border max-h-48 overflow-y-auto">
                  {eligibleSalesQuery.isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Mencari pesanan...
                    </div>
                  ) : eligibleSales.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Pesanan selesai tidak ditemukan.</div>
                  ) : (
                    eligibleSales.map((sale) => (
                      <button
                        type="button"
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/40 ${
                          selectedSale?.id === sale.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{sale.saleNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.customerName || '-'} • {new Date(sale.saleDate).toLocaleDateString('id-ID')}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedSale && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-semibold">Validasi Pesanan</p>
                <p className="text-sm">No Resi/No Pesanan: <strong>{selectedSale.saleNumber}</strong></p>
                <p className="text-sm">Nama: <strong>{selectedSale.customerName || '-'}</strong></p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upload Foto Komplen (Maks 1MB)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      alert('Ukuran foto maksimal 1MB');
                      return;
                    }
                    setComplaintPhoto(file);
                  }}
                />
                {complaintPhoto && (
                  <p className="text-xs text-muted-foreground">
                    {complaintPhoto.name} ({Math.round(complaintPhoto.size / 1024)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tanggal Komplen</Label>
                  <Input
                    type="date"
                    value={effectiveComplaintDate}
                    onChange={(e) => {
                      if (!isUser) {
                        setComplaintDate(e.target.value);
                      }
                    }}
                    readOnly={isUser}
                    min={isUser ? today : undefined}
                    max={isUser ? today : undefined}
                />
                {isUser && <p className="text-xs text-muted-foreground">Role USER hanya boleh tanggal hari ini.</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan Komplen</Label>
              <Textarea
                placeholder="Jelaskan alasan komplen secara jelas"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={openPreview} disabled={!canSubmitComplaint}>
                <Send className="h-4 w-4 mr-2" />
                Preview & Konfirmasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Daftar Komplen</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cari nomor / nama"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING_TCP_REVIEW">Menunggu Review TCP</SelectItem>
                <SelectItem value="REJECTED_BY_TCP">Ditolak TCP</SelectItem>
                <SelectItem value="ACCEPTED_BY_TCP">Diterima TCP</SelectItem>
                <SelectItem value="REPLACEMENT_SHIPPED">Pesanan Komplen Sedang Dikirim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {complaintsQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat data komplen...
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Belum ada data komplen.</div>
          ) : (
            <div className="space-y-3">
              {complaints.map((complaint) => (
                <div key={complaint.id} className="rounded-lg border p-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{complaint.complaintNumber}</span>
                        <Badge variant="outline" className={statusBadgeClass(complaint.status)}>
                          {statusLabel(complaint.status)}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        Pesanan: <strong>{complaint.saleNumberSnapshot}</strong> •
                        Customer: <strong> {complaint.customerNameSnapshot || '-'} </strong>
                      </p>
                      <p className="text-sm text-muted-foreground">{complaint.reason}</p>
                      {complaint.rejectionReason && (
                        <p className="text-sm text-red-600">Alasan ditolak: {complaint.rejectionReason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Tanggal komplen: {new Date(complaint.complaintDate).toLocaleDateString('id-ID')}
                      </p>
                      {complaint.sale?.creator && (
                        <p className="text-xs text-muted-foreground">
                          Penanggung jawab pesanan: {complaint.sale.creator.fullName}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a href={getImageUrl(complaint.complaintPhoto)} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Lihat Foto</Button>
                      </a>

                      {complaint.replacementProofDocument && (
                        <a href={getImageUrl(complaint.replacementProofDocument)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Lihat PDF
                          </Button>
                        </a>
                      )}

                      {canTcpReview && complaint.status === 'PENDING_TCP_REVIEW' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              reviewComplaint.mutate({
                                id: complaint.id,
                                decision: 'ACCEPT',
                              })
                            }
                            disabled={reviewComplaint.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Terima
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(complaint)}
                            disabled={reviewComplaint.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                          </Button>
                        </>
                      )}

                      {canTcpReview && complaint.status === 'ACCEPTED_BY_TCP' && (
                        <Button size="sm" onClick={() => openShipDialog(complaint)}>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Resi Pengganti (PDF)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Komplen</DialogTitle>
            <DialogDescription>Pastikan data sudah benar sebelum dikirim.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>No Pesanan: <strong>{selectedSale?.saleNumber}</strong></p>
            <p>Nama: <strong>{selectedSale?.customerName || '-'}</strong></p>
            <p>Tanggal Komplen: <strong>{new Date(effectiveComplaintDate).toLocaleDateString('id-ID')}</strong></p>
            <p>Alasan: {reason}</p>
            {previewPhotoUrl && (
              <img src={previewPhotoUrl} alt="Preview komplen" className="w-full max-h-64 object-contain rounded border" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Periksa Lagi
            </Button>
            <Button onClick={submitComplaint} disabled={createComplaint.isPending}>
              {createComplaint.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Ya, Kirim Komplen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Komplen</DialogTitle>
            <DialogDescription>Masukkan alasan penolakan komplen.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Alasan penolakan"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={rejectReason.trim().length < 5 || reviewComplaint.isPending}>
              Tolak Komplen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resi Pengganti</DialogTitle>
            <DialogDescription>Upload PDF resi pengiriman barang pengganti.</DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.type !== 'application/pdf') {
                alert('File wajib PDF');
                return;
              }
              if (file.size > 2 * 1024 * 1024) {
                alert('Ukuran PDF maksimal 2MB');
                return;
              }
              setReplacementProof(file);
            }}
          />
          {replacementProof && (
            <p className="text-xs text-muted-foreground">
              {replacementProof.name} ({Math.round(replacementProof.size / 1024)} KB)
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={confirmShip} disabled={!replacementProof || shipComplaint.isPending}>
              {shipComplaint.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                'Kirim Resi PDF'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
