'use client';

import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '@/lib/stores/auth';
import {
  useClaimComplaint,
  useComplaints,
  useCreateComplaint,
  useEligibleComplaintSales,
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
import { notify } from '@/lib/notify';
import { Complaint, ComplaintStatus, Sale } from '@/types';
import { CheckCircle2, Eye, FileText, Loader2, Printer, Search, Send, Video } from 'lucide-react';

type ReceiptMode = 'UPLOAD' | 'GENERATED';

function statusLabel(status: ComplaintStatus) {
  switch (status) {
    case 'PENDING_TCP_REVIEW':
      return 'Menunggu Diterima TCP';
    case 'REJECTED_BY_TCP':
      return 'Ditolak TCP';
    case 'ACCEPTED_BY_TCP':
      return 'Sedang Diproses TCP';
    case 'REPLACEMENT_SHIPPED':
      return 'Sudah Diurus TCP';
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

function createSalesInfoPdf(params: {
  sale: Sale;
  complaintDate: string;
  reason: string;
  salesInformation: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientAddressNote: string;
}) {
  const {
    sale,
    complaintDate,
    reason,
    salesInformation,
    recipientName,
    recipientPhone,
    recipientAddress,
    recipientAddressNote,
  } = params;
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(14);
  doc.text('RESI KOMPLEN - INFORMASI PENJUALAN', 15, 18);
  doc.setFontSize(10);
  doc.text(`Tanggal Komplen: ${new Date(complaintDate).toLocaleDateString('id-ID')}`, 15, 26);
  doc.text(`No Pesanan: ${sale.saleNumber}`, 15, 32);
  doc.text(`Customer: ${sale.customerName || '-'}`, 15, 38);
  doc.text(`Tanggal Penjualan: ${new Date(sale.saleDate).toLocaleDateString('id-ID')}`, 15, 44);

  doc.setFontSize(11);
  doc.text('Alasan Komplen:', 15, 54);
  const reasonLines = doc.splitTextToSize(reason, 180);
  doc.text(reasonLines, 15, 60);

  const addressStartY = 70 + reasonLines.length * 5;
  doc.text('Detail Penerima Pengganti:', 15, addressStartY);
  doc.text(`Nama: ${recipientName}`, 15, addressStartY + 6);
  doc.text(`No HP: ${recipientPhone}`, 15, addressStartY + 12);
  const addressLines = doc.splitTextToSize(`Alamat: ${recipientAddress}`, 180);
  doc.text(addressLines, 15, addressStartY + 18);

  let infoStartY = addressStartY + 28 + addressLines.length * 5;
  if (recipientAddressNote) {
    const noteLines = doc.splitTextToSize(`Catatan Alamat: ${recipientAddressNote}`, 180);
    doc.text(noteLines, 15, infoStartY);
    infoStartY += 6 + noteLines.length * 5;
  }

  doc.text('Informasi Penjualan:', 15, infoStartY);
  const infoLines = doc.splitTextToSize(salesInformation, 180);
  doc.text(infoLines, 15, infoStartY + 6);

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `resi-komplen-${sale.saleNumber}.pdf`, {
    type: 'application/pdf',
  });
}

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const isUser = role === 'USER';
  const isTcp = role === 'TCP';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canCreate = isUser || isAdmin || isSuperAdmin;
  const canTcpProcess = isTcp || isSuperAdmin || isAdmin;

  const today = new Date().toISOString().split('T')[0];

  const [saleQuery, setSaleQuery] = useState('');
  const [debouncedSaleQuery, setDebouncedSaleQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reason, setReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientAddressNote, setRecipientAddressNote] = useState('');
  const [salesInformation, setSalesInformation] = useState('');
  const [complaintDate, setComplaintDate] = useState(today);
  const [complaintPhotos, setComplaintPhotos] = useState<File[]>([]);
  const [complaintVideo, setComplaintVideo] = useState<File | null>(null);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>('UPLOAD');
  const [uploadedReceiptPdf, setUploadedReceiptPdf] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'accept'>('view');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState('10');

  const createComplaint = useCreateComplaint();
  const claimComplaint = useClaimComplaint();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSaleQuery(saleQuery), 350);
    return () => clearTimeout(t);
  }, [saleQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchFilter(searchFilter), 350);
    return () => clearTimeout(t);
  }, [searchFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchFilter, pageLimit]);

  const eligibleSalesQuery = useEligibleComplaintSales(debouncedSaleQuery, {
    enabled: canCreate,
  });

  const complaintsQuery = useComplaints({
    page: currentPage,
    limit: Number(pageLimit),
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearchFilter || undefined,
  });

  const complaints: Complaint[] = useMemo(
    () => complaintsQuery.data?.data?.complaints ?? [],
    [complaintsQuery.data]
  );
  const eligibleSales: Sale[] = useMemo(
    () => eligibleSalesQuery.data?.data ?? [],
    [eligibleSalesQuery.data]
  );
  const complaintPagination = complaintsQuery.data?.data?.pagination;
  const totalComplaints = complaintPagination?.total ?? 0;
  const totalPages = complaintPagination?.totalPages ?? 1;
  const safeCurrentPage = complaintPagination?.page ?? currentPage;

  const selectedSaleStillExists = useMemo(() => {
    if (!selectedSale) return false;
    return eligibleSales.some((s) => s.id === selectedSale.id) || saleQuery.trim().length === 0;
  }, [selectedSale, eligibleSales, saleQuery]);

  const effectiveComplaintDate = isUser ? today : complaintDate;
  const hasValidReceipt =
    receiptMode === 'UPLOAD' ? !!uploadedReceiptPdf : salesInformation.trim().length >= 10;
  const hasValidRecipientDetails =
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 8 &&
    recipientAddress.trim().length >= 15;

  const canSubmitComplaint =
    !!selectedSale &&
    complaintPhotos.length > 0 &&
    reason.trim().length >= 5 &&
    hasValidRecipientDetails &&
    hasValidReceipt &&
    selectedSaleStillExists &&
    !createComplaint.isPending;

  const previewPhotoUrls = useMemo(
    () => complaintPhotos.map((file) => URL.createObjectURL(file)),
    [complaintPhotos]
  );

  useEffect(() => {
    return () => {
      previewPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewPhotoUrls]);

  const submitComplaint = async () => {
    if (!selectedSale || complaintPhotos.length === 0) return;

    let receiptPdfFile = uploadedReceiptPdf;
    if (receiptMode === 'GENERATED') {
      receiptPdfFile = createSalesInfoPdf({
        sale: selectedSale,
        complaintDate: effectiveComplaintDate,
        reason: reason.trim(),
        salesInformation: salesInformation.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        recipientAddressNote: recipientAddressNote.trim(),
      });
    }

    if (!receiptPdfFile) return;

    const formData = new FormData();
    formData.append('saleId', selectedSale.id);
    formData.append('reason', reason.trim());
    formData.append('complaintDate', effectiveComplaintDate);
    formData.append('receiptSource', receiptMode);
    formData.append('complaintReceiptPdf', receiptPdfFile);
    formData.append('salesInformation', salesInformation.trim());
    formData.append('recipientName', recipientName.trim());
    formData.append('recipientPhone', recipientPhone.trim());
    formData.append('recipientAddress', recipientAddress.trim());
    formData.append('recipientAddressNote', recipientAddressNote.trim());
    complaintPhotos.forEach((file) => {
      formData.append('complaintPhotos', file);
    });
    if (complaintVideo) {
      formData.append('complaintVideo', complaintVideo);
    }

    createComplaint.mutate(formData, {
      onSuccess: () => {
        setPreviewOpen(false);
        setSelectedSale(null);
        setReason('');
        setRecipientName('');
        setRecipientPhone('');
        setRecipientAddress('');
        setRecipientAddressNote('');
        setSalesInformation('');
        setComplaintDate(today);
        setComplaintPhotos([]);
        setComplaintVideo(null);
        setUploadedReceiptPdf(null);
        setReceiptMode('UPLOAD');
        setSaleQuery('');
        setDebouncedSaleQuery('');
      },
    });
  };

  const openComplaintDetail = (complaint: Complaint, mode: 'view' | 'accept' = 'view') => {
    setDetailComplaint(complaint);
    setDetailMode(mode);
  };

  const handleClaim = (complaint: Complaint) => {
    claimComplaint.mutate(
      { id: complaint.id },
      {
        onSuccess: () => {
          setDetailComplaint(null);
          setDetailMode('view');
        },
      }
    );
  };

  const handlePrintComplaint = (complaint: Complaint) => {
    const pdfUrl = complaint.complaintReceiptPdf
      ? getImageUrl(complaint.complaintReceiptPdf)
      : complaint.replacementProofDocument
        ? getImageUrl(complaint.replacementProofDocument)
        : '';

    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan' }, { label: 'Komplen' }]} />

      <div>
        <h1 className="text-3xl font-bold">Komplen Pesanan</h1>
        <p className="text-muted-foreground mt-1">
          Komplen untuk pesanan yang sudah dikirim atau sudah pelunasan.
        </p>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Buat Komplen Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cari Pesanan (Sudah Dikirim/Settled)</Label>
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
                    <div className="p-3 text-sm text-muted-foreground">Pesanan eligible tidak ditemukan.</div>
                  ) : (
                    eligibleSales.map((sale) => (
                      <button
                        type="button"
                        key={sale.id}
                        onClick={() => {
                          setSelectedSale(sale);
                          if (!recipientName.trim()) setRecipientName(sale.customerName || '');
                          if (!recipientPhone.trim()) setRecipientPhone(sale.customerPhone || '');
                        }}
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
                <p className="text-sm">No Pesanan: <strong>{selectedSale.saleNumber}</strong></p>
                <p className="text-sm">Nama: <strong>{selectedSale.customerName || '-'}</strong></p>
                <p className="text-sm">
                  Tanggal Penjualan: <strong>{new Date(selectedSale.saleDate).toLocaleDateString('id-ID')}</strong>
                </p>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Detail Penerima & Alamat Pengganti *</p>
                <p className="text-xs text-muted-foreground">
                  Isi data tujuan dengan jelas agar TCP bisa memproses pengiriman pengganti tanpa menebak dari alasan komplen.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Penerima *</Label>
                  <Input
                    placeholder="Nama lengkap penerima"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nomor HP Penerima *</Label>
                  <Input
                    placeholder="Contoh: 081234567890"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alamat Lengkap Penerima *</Label>
                <Textarea
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota/kabupaten, provinsi, kode pos"
                  rows={4}
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimal 15 karakter. Cantumkan detail area yang memudahkan kurir.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Catatan Alamat (Opsional)</Label>
                <Textarea
                  placeholder="Contoh: pagar hitam, patokan dekat masjid, titip satpam, jam penerimaan paket"
                  rows={2}
                  value={recipientAddressNote}
                  onChange={(e) => setRecipientAddressNote(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upload Foto Komplen (1-5 foto, maks 1MB/foto) *</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) {
                      setComplaintPhotos([]);
                      return;
                    }
                    if (files.length > 5) {
                      notify.warning('Maksimal 5 foto', {
                        description: 'Pilih ulang foto komplen dengan jumlah paling banyak 5 file.',
                      });
                      return;
                    }
                    const oversizeFile = files.find((file) => file.size > 1024 * 1024);
                    if (oversizeFile) {
                      notify.error('Ukuran foto terlalu besar', {
                        description: `${oversizeFile.name} melebihi batas 1MB. Kompres foto lalu unggah kembali.`,
                      });
                      return;
                    }
                    setComplaintPhotos(files);
                  }}
                />
                {complaintPhotos.length > 0 && (
                  <div className="space-y-1">
                    {complaintPhotos.map((file) => (
                      <p key={file.name + file.size} className="text-xs text-muted-foreground">
                        {file.name} ({Math.round(file.size / 1024)} KB)
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Video Komplen (Opsional, maks 25MB)</Label>
                <Input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setComplaintVideo(null);
                      return;
                    }
                    if (file.size > 25 * 1024 * 1024) {
                      notify.error('Video terlalu besar', {
                        description: 'Ukuran video maksimal 25MB. Kompres video lalu unggah kembali.',
                      });
                      return;
                    }
                    setComplaintVideo(file);
                  }}
                />
                {complaintVideo && (
                  <p className="text-xs text-muted-foreground">
                    {complaintVideo.name} ({Math.round(complaintVideo.size / 1024 / 1024)} MB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Disarankan upload video yang sudah dikompres dari perangkat.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Komplen</Label>
              <Input
                type="date"
                value={effectiveComplaintDate}
                onChange={(e) => {
                  if (!isUser) setComplaintDate(e.target.value);
                }}
                readOnly={isUser}
                min={isUser ? today : undefined}
                max={isUser ? today : undefined}
              />
              {isUser && <p className="text-xs text-muted-foreground">Role USER hanya boleh tanggal hari ini.</p>}
            </div>

            <div className="space-y-2">
              <Label>Alasan Komplen *</Label>
              <Textarea
                placeholder="Jelaskan alasan komplen secara jelas"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Sumber Resi Komplen (PDF) *</Label>
              <Select value={receiptMode} onValueChange={(value: ReceiptMode) => setReceiptMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPLOAD">Upload PDF Resi dari User</SelectItem>
                  <SelectItem value="GENERATED">Input Informasi Penjualan lalu Auto-PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {receiptMode === 'UPLOAD' ? (
              <div className="space-y-2">
                <Label>Upload PDF Resi Komplen (maks 5MB) *</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setUploadedReceiptPdf(null);
                      return;
                    }
                    if (file.type !== 'application/pdf') {
                      notify.error('Format file tidak sesuai', {
                        description: 'Resi komplen wajib memakai file PDF.',
                      });
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      notify.error('PDF terlalu besar', {
                        description: 'Ukuran PDF maksimal 5MB. Kompres file lalu unggah kembali.',
                      });
                      return;
                    }
                    setUploadedReceiptPdf(file);
                  }}
                />
                {uploadedReceiptPdf && (
                  <p className="text-xs text-muted-foreground">
                    {uploadedReceiptPdf.name} ({Math.round(uploadedReceiptPdf.size / 1024)} KB)
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Informasi Penjualan (akan diubah jadi PDF) *</Label>
                <Textarea
                  placeholder="Isi detail penjualan: alamat, no hp, akun buyer, kronologi, dan informasi lain yang dibutuhkan TCP"
                  rows={5}
                  value={salesInformation}
                  onChange={(e) => setSalesInformation(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimal 10 karakter. Sistem akan generate PDF resi otomatis saat kirim komplen.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setPreviewOpen(true)} disabled={!canSubmitComplaint}>
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
                <SelectItem value="PENDING_TCP_REVIEW">Menunggu Diterima TCP</SelectItem>
                <SelectItem value="ACCEPTED_BY_TCP">Sedang Diproses TCP</SelectItem>
                <SelectItem value="REPLACEMENT_SHIPPED">Sudah Diurus TCP</SelectItem>
                <SelectItem value="REJECTED_BY_TCP">Ditolak TCP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageLimit} onValueChange={setPageLimit}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / halaman</SelectItem>
                <SelectItem value="20">20 / halaman</SelectItem>
                <SelectItem value="50">50 / halaman</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            Total data: {totalComplaints}
          </div>
          {complaintsQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat data komplen...
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Belum ada data komplen.</div>
          ) : (
            <div className="space-y-3">
              {complaints.map((complaint) => {
                const receiptPdfPath = complaint.complaintReceiptPdf || complaint.replacementProofDocument;
                return (
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
                        {complaint.salesInformation && (
                          <p className="text-sm">
                            Informasi Penjualan: <span className="text-muted-foreground">{complaint.salesInformation}</span>
                          </p>
                        )}
                        <div className="text-sm rounded-md bg-muted/30 border p-2 space-y-1">
                          <p>
                            Penerima: <strong>{complaint.recipientName || '-'}</strong>
                            {complaint.recipientPhone ? ` - ${complaint.recipientPhone}` : ''}
                          </p>
                          <p className="text-muted-foreground">
                            Alamat: {complaint.recipientAddress || '-'}
                          </p>
                        </div>
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
                        {(complaint.complaintPhotos && complaint.complaintPhotos.length > 0
                          ? complaint.complaintPhotos
                          : [complaint.complaintPhoto]
                        ).map((photo, index) => (
                          <a key={`${complaint.id}-photo-${index}`} href={getImageUrl(photo)} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">Lihat Foto {index + 1}</Button>
                          </a>
                        ))}

                        {receiptPdfPath && (
                          <a href={getImageUrl(receiptPdfPath)} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              Lihat PDF Resi
                            </Button>
                          </a>
                        )}

                        {complaint.complaintVideo && (
                          <a href={getImageUrl(complaint.complaintVideo)} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              <Video className="h-4 w-4 mr-1" />
                              Lihat Video
                            </Button>
                          </a>
                        )}

                        {canTcpProcess && (
                          <>
                            <Button
                              size="sm"
                              variant={complaint.status === 'PENDING_TCP_REVIEW' ? 'default' : 'outline'}
                              onClick={() => openComplaintDetail(complaint, complaint.status === 'PENDING_TCP_REVIEW' ? 'accept' : 'view')}
                              disabled={claimComplaint.isPending && detailComplaint?.id === complaint.id}
                            >
                              {complaint.status === 'PENDING_TCP_REVIEW' ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Terima
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detail
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintComplaint(complaint)}
                              disabled={
                                !['ACCEPTED_BY_TCP', 'REPLACEMENT_SHIPPED'].includes(complaint.status) ||
                                !receiptPdfPath
                              }
                              title={
                                complaint.status === 'PENDING_TCP_REVIEW'
                                  ? 'Terima komplen dulu sebelum print'
                                  : undefined
                              }
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Halaman {safeCurrentPage} dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage <= 1 || complaintsQuery.isFetching}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage >= totalPages || complaintsQuery.isFetching}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!detailComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setDetailComplaint(null);
            setDetailMode('view');
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailMode === 'accept' ? 'Terima Komplen' : 'Detail Komplen'}
            </DialogTitle>
            <DialogDescription>
              Periksa detail pesanan, alasan, foto, dan alamat penerima sebelum diproses TCP.
            </DialogDescription>
          </DialogHeader>

          {detailComplaint && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Komplen</p>
                  <p>No Komplen: <strong>{detailComplaint.complaintNumber}</strong></p>
                  <p>Status: <Badge variant="outline" className={statusBadgeClass(detailComplaint.status)}>{statusLabel(detailComplaint.status)}</Badge></p>
                  <p>Tanggal: <strong>{new Date(detailComplaint.complaintDate).toLocaleDateString('id-ID')}</strong></p>
                </div>
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Pesanan</p>
                  <p>No Pesanan: <strong>{detailComplaint.saleNumberSnapshot}</strong></p>
                  <p>Customer Sale: <strong>{detailComplaint.customerNameSnapshot || '-'}</strong></p>
                  {detailComplaint.sale?.creator && (
                    <p>PIC Pesanan: <strong>{detailComplaint.sale.creator.fullName}</strong></p>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Detail Penerima Pengganti</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <p>Nama: <strong>{detailComplaint.recipientName || '-'}</strong></p>
                  <p>No HP: <strong>{detailComplaint.recipientPhone || '-'}</strong></p>
                </div>
                <p>Alamat Lengkap:</p>
                <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{detailComplaint.recipientAddress || '-'}</p>
                {detailComplaint.recipientAddressNote && (
                  <>
                    <p>Catatan Alamat:</p>
                    <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{detailComplaint.recipientAddressNote}</p>
                  </>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Alasan & Informasi</p>
                <p>Alasan Komplen:</p>
                <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{detailComplaint.reason}</p>
                {detailComplaint.salesInformation && (
                  <>
                    <p>Informasi Penjualan:</p>
                    <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{detailComplaint.salesInformation}</p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(detailComplaint.complaintPhotos && detailComplaint.complaintPhotos.length > 0
                  ? detailComplaint.complaintPhotos
                  : [detailComplaint.complaintPhoto]
                ).map((photo, index) => (
                  <a key={`${detailComplaint.id}-detail-photo-${index}`} href={getImageUrl(photo)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">Lihat Foto {index + 1}</Button>
                  </a>
                ))}
                {detailComplaint.complaintReceiptPdf && (
                  <a href={getImageUrl(detailComplaint.complaintReceiptPdf)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" />
                      Lihat PDF Resi
                    </Button>
                  </a>
                )}
                {detailComplaint.complaintVideo && (
                  <a href={getImageUrl(detailComplaint.complaintVideo)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-1" />
                      Lihat Video
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDetailComplaint(null);
                setDetailMode('view');
              }}
            >
              Tutup
            </Button>
            {detailComplaint && detailMode === 'accept' && detailComplaint.status === 'PENDING_TCP_REVIEW' && (
              <Button onClick={() => handleClaim(detailComplaint)} disabled={claimComplaint.isPending}>
                {claimComplaint.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Terima Komplen
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="rounded-md border p-3 space-y-1">
              <p className="font-semibold">Detail Penerima Pengganti</p>
              <p>Nama Penerima: <strong>{recipientName || '-'}</strong></p>
              <p>No HP: <strong>{recipientPhone || '-'}</strong></p>
              <p>Alamat: {recipientAddress || '-'}</p>
              {recipientAddressNote.trim() && <p>Catatan: {recipientAddressNote}</p>}
            </div>
            <p>Alasan: {reason}</p>
            <p>Mode Resi PDF: <strong>{receiptMode === 'UPLOAD' ? 'Upload PDF' : 'Auto Generate dari Informasi Penjualan'}</strong></p>
            {receiptMode === 'GENERATED' && salesInformation.trim() && (
              <p>Informasi Penjualan: {salesInformation}</p>
            )}
            {complaintVideo && (
              <p>Video: {complaintVideo.name}</p>
            )}
            {previewPhotoUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previewPhotoUrls.map((url, index) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Preview komplen ${index + 1}`}
                    className="w-full max-h-64 object-contain rounded border"
                  />
                ))}
              </div>
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
    </div>
  );
}
