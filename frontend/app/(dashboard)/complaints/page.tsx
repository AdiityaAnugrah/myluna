'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '@/lib/stores/auth';
import {
  useClaimComplaint,
  useCloseComplaintCase,
  useComplaints,
  useConfirmComplaintDelivered,
  useCompleteComplaint,
  useCreateComplaint,
  useComplaintDetail,
  useConvertComplaintToReturn,
  useEligibleComplaintSales,
  useMarkComplaintHandled,
  useProcessComplaintComponentShipment,
  useRecordComplaintSettlementDeduction,
  useRequestComplaintFollowUp,
  useSetComplaintDecision,
} from '@/lib/hooks/useComplaints';
import { useProducts } from '@/lib/hooks/useProducts';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getImageUrl } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import { PreviewableImage } from '@/components/ui/previewable-image';
import { ComplaintReturnMenu } from '@/components/complaint-return-menu';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';
import { notify } from '@/lib/notify';
import { getComplaintStatusBadgeClass, getComplaintStatusLabel } from '@/lib/constants/workflowStatus';
import { Complaint, ComplaintResolutionType, ComplaintStatus, ComplaintType, Sale } from '@/types';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  Send,
  UserRound,
} from 'lucide-react';

function statusLabel(status: ComplaintStatus) {
  return getComplaintStatusLabel(status);
}

function statusBadgeClass(status: ComplaintStatus) {
  return getComplaintStatusBadgeClass(status);
}

function sanitizeComplaintSalesInformation(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => !/^\s*by\s*:/i.test(line))
    .join('\n')
    .trim();
}

function getComplaintTypeLabel(type?: ComplaintType | null) {
  if (type === 'HARDWARE') return 'Hardware / Barang Besar';
  if (type === 'ACCESSORY') return 'Aksesoris / Barang Kecil';
  return '-';
}

function getDeadlineInfo(deadline?: string | null) {
  if (!deadline) return null;
  const target = new Date(deadline).getTime();
  if (Number.isNaN(target)) return null;
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / 86_400_000);
  return {
    date: new Date(deadline).toLocaleDateString('id-ID'),
    diffDays,
    overdue: diffDays < 0,
    text: diffDays < 0 ? `Melewati Deadline ${Math.abs(diffDays)} hari` : diffDays === 0 ? 'Jatuh tempo hari ini' : `Sisa ${diffDays} hari`,
  };
}

function getOverdueDeadlineWarnings(items: Array<{ label: string; info: ReturnType<typeof getDeadlineInfo> }>) {
  return items
    .filter((item): item is { label: string; info: NonNullable<ReturnType<typeof getDeadlineInfo>> } => !!item.info?.overdue)
    .map((item) => `${item.label} lewat ${Math.abs(item.info.diffDays)} hari`);
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
  const infoLines = doc.splitTextToSize(sanitizeComplaintSalesInformation(salesInformation), 180);
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
  const isDev = role === 'DEV';
  const isAdminView = isAdmin || isSuperAdmin || isDev;
  const canCreate = isUser || isAdmin || isSuperAdmin || isDev;
  const canTcpProcess = isTcp || isSuperAdmin || isAdmin || isDev;

  const today = getTodayDateInputValue();

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
  const [complaintType, setComplaintType] = useState<ComplaintType | ''>('');
  const [complaintPhotos, setComplaintPhotos] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'accept'>('view');
  const [acceptedComplaintIds, setAcceptedComplaintIds] = useState<Set<string>>(new Set());
  const [complaintScope, setComplaintScope] = useState<'active' | 'history'>('active');
  const [followUpComplaint, setFollowUpComplaint] = useState<Complaint | null>(null);
  const [followUpReason, setFollowUpReason] = useState('');
  const [decisionComplaint, setDecisionComplaint] = useState<Complaint | null>(null);
  const [decisionType, setDecisionType] = useState<ComplaintResolutionType>('SEND_COMPONENT');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [netReceivedAmount, setNetReceivedAmount] = useState('');
  const [componentProductId, setComponentProductId] = useState('');
  const [componentVariantName, setComponentVariantName] = useState('');
  const [componentQty, setComponentQty] = useState('1');
  const [componentShippingService, setComponentShippingService] = useState('');
  const [componentShippingCost, setComponentShippingCost] = useState('0');
  const [returnSaleItemId, setReturnSaleItemId] = useState('');
  const [returnQty, setReturnQty] = useState('1');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState('10');

  const createComplaint = useCreateComplaint();
  const claimComplaint = useClaimComplaint();
  const confirmDelivered = useConfirmComplaintDelivered();
  const closeComplaintCase = useCloseComplaintCase();
  const completeComplaint = useCompleteComplaint();
  const markComplaintHandled = useMarkComplaintHandled();
  const requestComplaintFollowUp = useRequestComplaintFollowUp();
  const setDecision = useSetComplaintDecision();
  const recordDeduction = useRecordComplaintSettlementDeduction();
  const processComponent = useProcessComplaintComponentShipment();
  const convertToReturn = useConvertComplaintToReturn();
  const decisionDetail = useComplaintDetail(decisionComplaint?.id, { enabled: !!decisionComplaint });
  const productsQuery = useProducts({ page: 1, limit: 100, isActive: true }, { enabled: !!decisionComplaint && decisionType === 'SEND_COMPONENT' });

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
  }, [statusFilter, debouncedSearchFilter, pageLimit, complaintScope]);

  const eligibleSalesQuery = useEligibleComplaintSales(debouncedSaleQuery, {
    enabled: canCreate,
  });

  const complaintsQuery = useComplaints({
    page: currentPage,
    limit: Number(pageLimit),
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearchFilter || undefined,
    scope: statusFilter === 'all' ? complaintScope : undefined,
  });

  const complaints: Complaint[] = useMemo(
    () => complaintsQuery.data?.data?.complaints ?? [],
    [complaintsQuery.data]
  );
  const eligibleSales: Sale[] = useMemo(
    () => eligibleSalesQuery.data?.data ?? [],
    [eligibleSalesQuery.data]
  );
  const componentProducts = productsQuery.data?.data?.products ?? [];
  const decisionFullComplaint = decisionDetail.data?.data ?? decisionComplaint;
  const complaintPagination = complaintsQuery.data?.data?.pagination;
  const totalComplaints = complaintPagination?.total ?? 0;
  const totalPages = complaintPagination?.totalPages ?? 1;
  const safeCurrentPage = complaintPagination?.page ?? currentPage;

  const selectedSaleStillExists = useMemo(() => {
    if (!selectedSale) return false;
    return eligibleSales.some((s) => s.id === selectedSale.id) || saleQuery.trim().length === 0;
  }, [selectedSale, eligibleSales, saleQuery]);

  const effectiveComplaintDate = isUser ? today : complaintDate;
  const cleanSalesInformation = sanitizeComplaintSalesInformation(salesInformation);
  const hasValidReceipt = cleanSalesInformation.length >= 10;
  const hasValidRecipientDetails =
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 8 &&
    recipientAddress.trim().length >= 15;

  const canSubmitComplaint =
    !!selectedSale &&
    !!complaintType &&
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

    const receiptPdfFile = createSalesInfoPdf({
      sale: selectedSale,
      complaintDate: effectiveComplaintDate,
      reason: reason.trim(),
      salesInformation: cleanSalesInformation,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientAddress: recipientAddress.trim(),
      recipientAddressNote: recipientAddressNote.trim(),
    });

    const formData = new FormData();
    formData.append('saleId', selectedSale.id);
    formData.append('reason', reason.trim());
    formData.append('complaintDate', effectiveComplaintDate);
    formData.append('complaintType', complaintType);
    formData.append('receiptSource', 'GENERATED');
    formData.append('complaintReceiptPdf', receiptPdfFile);
    formData.append('salesInformation', cleanSalesInformation);
    formData.append('recipientName', recipientName.trim());
    formData.append('recipientPhone', recipientPhone.trim());
    formData.append('recipientAddress', recipientAddress.trim());
    formData.append('recipientAddressNote', recipientAddressNote.trim());
    complaintPhotos.forEach((file) => {
      formData.append('complaintPhotos', file);
    });
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
        setComplaintType('');
        setComplaintPhotos([]);
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
          setAcceptedComplaintIds((prev) => new Set(prev).add(complaint.id));
          setDetailComplaint(null);
          setDetailMode('view');
          void complaintsQuery.refetch();
        },
      }
    );
  };

  const handlePrintComplaint = (complaint: Complaint) => {
    const canPrint =
      ['ACCEPTED_BY_TCP', 'REPLACEMENT_SHIPPED', 'WAITING_USER_CONFIRMATION', 'WAITING_USER_DELIVERY_CONFIRMATION', 'MONITORING_CUSTOMER_CONFIRMATION', 'COMPLETED'].includes(complaint.status) ||
      acceptedComplaintIds.has(complaint.id);

    if (!canPrint) {
      notify.warning('Terima untuk diproses dulu sebelum print');
      return;
    }

    const pdfUrl = complaint.complaintReceiptPdf
      ? getImageUrl(complaint.complaintReceiptPdf)
      : complaint.replacementProofDocument
        ? getImageUrl(complaint.replacementProofDocument)
        : '';

    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!complaint.salesInformation) {
      notify.error('PDF resi belum tersedia', {
        description: 'Data informasi penjualan tidak cukup untuk membuat ulang PDF.',
      });
      return;
    }

    const fallbackPdf = createSalesInfoPdf({
      sale: {
        id: complaint.saleId,
        saleNumber: complaint.saleNumberSnapshot,
        saleDate: complaint.sale?.saleDate || complaint.complaintDate,
        customerName: complaint.customerNameSnapshot,
        customerPhone: null,
        paymentMethod: 'TRANSFER',
        platform: '-',
        totalAmount: '0',
        status: 'PROCESSED',
        notes: null,
        createdBy: complaint.createdBy,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      } as Sale,
      complaintDate: complaint.complaintDate,
      reason: complaint.reason,
      salesInformation: complaint.salesInformation,
      recipientName: complaint.recipientName || '-',
      recipientPhone: complaint.recipientPhone || '-',
      recipientAddress: complaint.recipientAddress || '-',
      recipientAddressNote: complaint.recipientAddressNote || '',
    });
    const objectUrl = URL.createObjectURL(fallbackPdf);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const handleRequestFollowUp = () => {
    if (!followUpComplaint) return;
    requestComplaintFollowUp.mutate(
      { id: followUpComplaint.id, reason: followUpReason.trim() },
      {
        onSuccess: () => {
          setFollowUpComplaint(null);
          setFollowUpReason('');
          void complaintsQuery.refetch();
        },
      }
    );
  };


  const openDecisionDialog = (complaint: Complaint) => {
    setDecisionComplaint(complaint);
    setDecisionType((complaint.resolutionType as ComplaintResolutionType) || 'SEND_COMPONENT');
    setDecisionNotes(complaint.resolutionNotes || '');
    setDeductionAmount(complaint.deductionAmount || '');
    setNetReceivedAmount(complaint.netReceivedAmount || '');
    setComponentProductId('');
    setComponentVariantName('');
    setComponentQty('1');
    setComponentShippingService(complaint.componentShippingService || '');
    setComponentShippingCost(complaint.componentShippingCost || '0');
    setReturnSaleItemId('');
    setReturnQty('1');
  };

  const closeDecisionDialog = () => setDecisionComplaint(null);

  const submitDecisionFlow = () => {
    if (!decisionComplaint) return;
    const id = decisionComplaint.id;
    if (decisionType === 'SETTLEMENT_DEDUCTION') {
      recordDeduction.mutate({ id, data: { deductionAmount: Number(deductionAmount), netReceivedAmount: Number(netReceivedAmount), deductionReason: decisionNotes, notes: decisionNotes } }, { onSuccess: closeDecisionDialog });
      return;
    }
    if (decisionType === 'SEND_COMPONENT') {
      processComponent.mutate({ id, data: { items: [{ productId: componentProductId, variantName: componentVariantName || null, quantity: Number(componentQty), notes: decisionNotes }], shippingService: componentShippingService, shippingCost: Number(componentShippingCost || 0), notes: decisionNotes } }, { onSuccess: closeDecisionDialog });
      return;
    }
    if (decisionType === 'CONVERT_TO_RETURN') {
      convertToReturn.mutate({ id, data: { items: [{ saleItemId: returnSaleItemId, qtyRequested: Number(returnQty) }], reason: decisionNotes || decisionComplaint.reason, notes: decisionNotes } }, { onSuccess: closeDecisionDialog });
      return;
    }
    setDecision.mutate({ id, data: { resolutionType: decisionType, resolutionNotes: decisionNotes } }, { onSuccess: closeDecisionDialog });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan' }, { label: 'Komplen' }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Komplen Pesanan</h1>
          <p className="text-muted-foreground mt-1">
            Komplen untuk pesanan yang sudah diproses, selesai, atau sudah pelunasan.
          </p>
        </div>
      </div>

      <ComplaintReturnMenu active="complaints" role={role} />

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Buat Komplen Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cari Pesanan (Diproses / Selesai / Pelunasan)</Label>
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

            <div className="space-y-2">
              <Label>Jenis Komplen *</Label>
              <Select value={complaintType} onValueChange={(value) => setComplaintType(value as ComplaintType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis barang yang dikomplen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HARDWARE">Hardware / Barang Besar - SLA PUSAT 14 hari kerja</SelectItem>
                  <SelectItem value="ACCESSORY">Aksesoris / Barang Kecil - SLA PUSAT 7 hari kerja</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pilihan ini menentukan Batas Waktu PUSAT untuk menangani Komplen.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Detail Penerima & Alamat Pengganti *</p>
                <p className="text-xs text-muted-foreground">
                  Isi data tujuan dengan jelas agar PUSAT bisa memproses pengiriman pengganti tanpa menebak dari alasan komplen.
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

            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <Label>Tanggal Komplen</Label>
              <Input
                type="date"
                value={effectiveComplaintDate}
                onChange={(e) => {
                  if (!isUser) setComplaintDate(e.target.value);
                }}
                {...getUserTodayDateInputProps(isUser)}
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
              <Label>Informasi Penjualan untuk PDF Resi *</Label>
              <Textarea
                placeholder="Isi detail penjualan: alamat, no hp, akun buyer, kronologi, dan informasi lain yang dibutuhkan PUSAT"
                rows={5}
                value={salesInformation}
                onChange={(e) => setSalesInformation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimal 10 karakter. Sistem akan generate PDF resi otomatis saat kirim komplen.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setPreviewOpen(true)} disabled={!canSubmitComplaint}>
                <Send className="h-4 w-4 mr-2" />
                Preview & Konfirmasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b bg-gradient-to-r from-orange-50 via-background to-background dark:from-orange-950/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <PackageCheck className="h-6 w-6 text-orange-500" />
                {complaintScope === 'active' ? 'Komplen Aktif' : 'Riwayat Komplen'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {complaintScope === 'active'
                  ? 'Pantau komplen yang masih berjalan, deadline, penerima, bukti foto, dan aksi lanjutan.'
                  : 'Daftar komplen yang sudah selesai, ditolak, atau dialihkan ke retur.'}
              </p>
            </div>
            <Tabs
              value={complaintScope}
              onValueChange={(value) => {
                setComplaintScope(value as 'active' | 'history');
                setStatusFilter('all');
              }}
            >
              <TabsList>
                <TabsTrigger value="active">Aktif</TabsTrigger>
                <TabsTrigger value="history">Riwayat Komplen</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_260px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari no komplen, no pesanan, nama customer..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING_TCP_REVIEW">Menunggu Review PUSAT</SelectItem>
                <SelectItem value="ACCEPTED_BY_TCP">Sedang Ditangani PUSAT</SelectItem>
                <SelectItem value="REPLACEMENT_SHIPPED">Pengganti Sudah Dikirim</SelectItem>
                <SelectItem value="WAITING_USER_CONFIRMATION">Menunggu Konfirmasi User</SelectItem>
                <SelectItem value="WAITING_USER_DELIVERY_CONFIRMATION">Menunggu Konfirmasi Barang Sampai</SelectItem>
                <SelectItem value="MONITORING_CUSTOMER_CONFIRMATION">Masa Konfirmasi Pelanggan</SelectItem>
                <SelectItem value="FOLLOW_UP_REQUIRED">Perlu Tindak Lanjut</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="CONVERTED_TO_RETURN">Dialihkan ke Retur</SelectItem>
                <SelectItem value="REJECTED_BY_TCP">Ditolak PUSAT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageLimit} onValueChange={setPageLimit}>
              <SelectTrigger>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">
                {totalComplaints} data {complaintScope === 'active' ? 'komplen aktif' : 'riwayat komplen'}
              </p>
              <p className="text-xs text-muted-foreground">
                Gunakan pencarian dan filter status untuk mempercepat pengecekan.
              </p>
            </div>
            <Badge variant="outline" className="bg-background">
              Halaman {safeCurrentPage} / {totalPages}
            </Badge>
          </div>
          {complaintsQuery.isLoading ? (
            <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat data komplen...
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Belum ada data komplen.</div>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => {
                const receiptPdfPath = complaint.complaintReceiptPdf || complaint.replacementProofDocument;
                const isAcceptedForPrint =
                  ['ACCEPTED_BY_TCP', 'REPLACEMENT_SHIPPED', 'WAITING_USER_CONFIRMATION', 'WAITING_USER_DELIVERY_CONFIRMATION', 'MONITORING_CUSTOMER_CONFIRMATION', 'COMPLETED'].includes(complaint.status) ||
                  acceptedComplaintIds.has(complaint.id);
                const isPendingReview = complaint.status === 'PENDING_TCP_REVIEW' && !acceptedComplaintIds.has(complaint.id);
                const isFollowUpRequired = complaint.status === 'FOLLOW_UP_REQUIRED';
                const canMarkHandled = complaint.status === 'ACCEPTED_BY_TCP';
                const tcpDeadline = getDeadlineInfo(complaint.tcpDeadlineAt);
                const deliveryDeadline = getDeadlineInfo(complaint.deliveryConfirmDeadlineAt);
                const customerCheckDeadline = getDeadlineInfo(complaint.customerCheckDeadlineAt);
                const canUserConfirm =
                  (isUser || isAdmin || isSuperAdmin || isDev) &&
                  ['WAITING_USER_CONFIRMATION', 'REPLACEMENT_SHIPPED'].includes(complaint.status);
                const canConfirmDelivered =
                  (isUser || isAdmin || isSuperAdmin || isDev) &&
                  complaint.status === 'WAITING_USER_DELIVERY_CONFIRMATION';
                const canCloseCase =
                  (isUser || isAdmin || isSuperAdmin || isDev) &&
                  complaint.status === 'MONITORING_CUSTOMER_CONFIRMATION';
                const complaintPhotos = complaint.complaintPhotos && complaint.complaintPhotos.length > 0
                  ? complaint.complaintPhotos
                  : [complaint.complaintPhoto].filter(Boolean);
                const overdueWarnings = getOverdueDeadlineWarnings([
                  { label: 'Deadline PUSAT', info: tcpDeadline },
                  { label: 'Deadline barang sampai', info: deliveryDeadline },
                  { label: 'Deadline konfirmasi pelanggan', info: customerCheckDeadline },
                ]);
                return (
                  <div
                    key={complaint.id}
                    className={cn(
                      'group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md',
                      overdueWarnings.length > 0 && 'border-red-400 shadow-red-100 dark:shadow-red-950/20'
                    )}
                  >
                    {overdueWarnings.length > 0 && (
                      <div className="border-b-2 border-red-500 bg-red-600 px-4 py-3 text-white">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
                            <div>
                              <p className="font-black uppercase tracking-wide">PERINGATAN KERAS: DEADLINE KOMPLEN TERLEWAT</p>
                              <p className="mt-0.5 text-sm text-white/90">
                                {overdueWarnings.join(' • ')}. Segera tindak lanjuti agar komplen tidak menggantung.
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-white text-red-700 hover:bg-white">
                            PRIORITAS URGENT
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div className="border-b bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-base font-black tracking-tight">{complaint.complaintNumber}</span>
                            <Badge variant="outline" className={statusBadgeClass(complaint.status)}>
                              {statusLabel(complaint.status)}
                            </Badge>
                            <Badge variant="secondary" className="font-normal">
                              {getComplaintTypeLabel(complaint.complaintType)}
                            </Badge>
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate">
                                Pesanan: <strong className="text-foreground">{complaint.saleNumberSnapshot}</strong>
                              </span>
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                              <UserRound className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate">
                                Customer: <strong className="text-foreground">{complaint.customerNameSnapshot || '-'}</strong>
                              </span>
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                              <span>
                                Tgl komplen: <strong className="text-foreground">{new Date(complaint.complaintDate).toLocaleDateString('id-ID')}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {complaintPhotos.length > 0 && (
                            <Badge variant="outline" className="bg-background">
                              <ImageIcon className="mr-1 h-3.5 w-3.5" />
                              {complaintPhotos.length} foto
                            </Badge>
                          )}
                          {receiptPdfPath && (
                            <a href={getImageUrl(receiptPdfPath)} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="h-8 bg-background">
                                <FileText className="mr-1 h-4 w-4" />
                                PDF Resi
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 xl:grid-cols-[1fr_260px]">
                      <div className="space-y-4">
                        <div className="rounded-xl border bg-background p-3">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Alasan Komplen</p>
                          <p className="text-sm leading-6">{complaint.reason}</p>
                          {complaint.salesInformation && (
                            <p className="mt-2 border-t pt-2 text-sm text-muted-foreground">
                              <strong className="text-foreground">Info Penjualan:</strong>{' '}
                              {sanitizeComplaintSalesInformation(complaint.salesInformation)}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                            <div className="mb-2 flex items-center gap-2 font-semibold">
                              <MapPin className="h-4 w-4 text-primary" />
                              Penerima Pengganti
                            </div>
                            <p>
                              <strong>{complaint.recipientName || '-'}</strong>
                              {complaint.recipientPhone ? ` · ${complaint.recipientPhone}` : ''}
                            </p>
                            <p className="mt-1 line-clamp-2 text-muted-foreground">{complaint.recipientAddress || '-'}</p>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                            <div className="mb-2 flex items-center gap-2 font-semibold">
                              <Clock3 className="h-4 w-4 text-primary" />
                              Timeline
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Komplen: {new Date(complaint.complaintDate).toLocaleDateString('id-ID')}</p>
                              {complaint.shippedAt && <p>Pengganti dikirim: {new Date(complaint.shippedAt).toLocaleDateString('id-ID')}</p>}
                              {complaint.completedAt && <p>Selesai: {new Date(complaint.completedAt).toLocaleDateString('id-ID')}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2 text-xs md:grid-cols-2">
                          {tcpDeadline && (
                            <div className={`rounded-xl border p-3 ${tcpDeadline.overdue ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200' : 'bg-muted/20'}`}>
                              <div className="font-bold">Batas Waktu PUSAT</div>
                              <div className="mt-1">{tcpDeadline.date} • {tcpDeadline.text}</div>
                            </div>
                          )}
                          {(deliveryDeadline || customerCheckDeadline) && (
                            <div className={`rounded-xl border p-3 ${(deliveryDeadline?.overdue || customerCheckDeadline?.overdue) ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200' : 'bg-muted/20'}`}>
                              <div className="font-bold">
                                {customerCheckDeadline ? 'Batas Konfirmasi Pelanggan' : 'Batas Konfirmasi Barang Sampai'}
                              </div>
                              <div className="mt-1">
                                {customerCheckDeadline
                                  ? `${customerCheckDeadline.date} • ${customerCheckDeadline.text}`
                                  : deliveryDeadline
                                    ? `${deliveryDeadline.date} • ${deliveryDeadline.text}`
                                    : '-'}
                              </div>
                            </div>
                          )}
                        </div>

                        {complaint.rejectionReason && (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200">
                            <strong>Alasan ditolak:</strong> {complaint.rejectionReason}
                          </div>
                        )}
                        {complaint.followUpReason && (
                          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/20 dark:text-orange-200">
                            <strong>Alasan tindak lanjut:</strong> {complaint.followUpReason}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {complaintPhotos.length > 0 && (
                          <div className="rounded-xl border bg-muted/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Bukti Foto</p>
                            <div className="grid grid-cols-3 gap-2 xl:grid-cols-2">
                              {complaintPhotos.map((photo, index) => (
                                <PreviewableImage
                                  key={`${complaint.id}-photo-${index}`}
                                  src={photo}
                                  alt={`Foto komplen ${index + 1}`}
                                  className="h-16 w-full"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rounded-xl border bg-background p-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Aksi</p>
                          <div className="flex flex-col gap-2">
                        {canTcpProcess && (
                          <>
                            <Button
                              size="sm"
                              variant={isPendingReview || isFollowUpRequired ? 'default' : 'outline'}
                              onClick={() => openComplaintDetail(complaint, isPendingReview || isFollowUpRequired ? 'accept' : 'view')}
                              disabled={claimComplaint.isPending && detailComplaint?.id === complaint.id}
                              className="justify-center"
                            >
                              {isPendingReview ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Terima
                                </>
                              ) : isFollowUpRequired ? (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Tangani Lagi
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
                              disabled={!isAcceptedForPrint}
                              className="justify-center"
                              title={
                                !isAcceptedForPrint
                                  ? 'Terima untuk diproses dulu sebelum print'
                                  : undefined
                              }
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </Button>

                            {['PENDING_TCP_REVIEW', 'ACCEPTED_BY_TCP', 'FOLLOW_UP_REQUIRED'].includes(complaint.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDecisionDialog(complaint)}
                                className="justify-center"
                              >
                                Pilih Keputusan
                              </Button>
                            )}

                            {canMarkHandled && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markComplaintHandled.mutate({ id: complaint.id })}
                                disabled={markComplaintHandled.isPending}
                                className="justify-center"
                              >
                                Tandai Pengganti Dikirim
                              </Button>
                            )}
                          </>
                        )}
                        {canUserConfirm && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => completeComplaint.mutate({ id: complaint.id })}
                              disabled={completeComplaint.isPending}
                              className="justify-center"
                            >
                              Konfirmasi Selesai
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFollowUpComplaint(complaint);
                                setFollowUpReason('');
                              }}
                              disabled={requestComplaintFollowUp.isPending}
                              className="justify-center"
                            >
                              Belum Selesai
                            </Button>
                          </>
                        )}
                        {canConfirmDelivered && (
                          <Button
                            size="sm"
                            onClick={() => confirmDelivered.mutate({ id: complaint.id })}
                            disabled={confirmDelivered.isPending}
                            className="justify-center"
                          >
                            Konfirmasi Barang Sampai
                          </Button>
                        )}
                        {canCloseCase && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => closeComplaintCase.mutate({ id: complaint.id })}
                              disabled={closeComplaintCase.isPending}
                              className="justify-center"
                            >
                              Tutup Kasus
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFollowUpComplaint(complaint);
                                setFollowUpReason('');
                              }}
                              disabled={requestComplaintFollowUp.isPending}
                              className="justify-center"
                            >
                              Ada Komplen Lagi
                            </Button>
                          </>
                        )}
                          </div>
                        </div>
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
              {detailMode === 'accept'
                ? detailComplaint?.status === 'FOLLOW_UP_REQUIRED'
                  ? 'Tangani Lagi'
                  : 'Terima untuk Diproses'
                : 'Detail Komplen'}
            </DialogTitle>
            <DialogDescription>
              Periksa detail pesanan, alasan, foto, alamat penerima, dan catatan tindak lanjut sebelum diproses PUSAT.
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
                    <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">
                      {sanitizeComplaintSalesInformation(detailComplaint.salesInformation)}
                    </p>
                  </>
                )}
                {detailComplaint.followUpReason && (
                  <>
                    <p>Alasan Tindak Lanjut:</p>
                    <p className="whitespace-pre-wrap rounded bg-orange-50 p-2 text-orange-800">
                      {detailComplaint.followUpReason}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(detailComplaint.complaintPhotos && detailComplaint.complaintPhotos.length > 0
                  ? detailComplaint.complaintPhotos
                  : [detailComplaint.complaintPhoto]
                ).map((photo, index) => (
                  <PreviewableImage
                    key={`${detailComplaint.id}-detail-photo-${index}`}
                    src={photo}
                    alt={`Foto detail komplen ${index + 1}`}
                    className="h-16 w-20"
                  />
                ))}
                {detailComplaint.complaintReceiptPdf && (
                  <a href={getImageUrl(detailComplaint.complaintReceiptPdf)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" />
                      Lihat PDF Resi
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
            {detailComplaint &&
              detailMode === 'accept' &&
              ['PENDING_TCP_REVIEW', 'FOLLOW_UP_REQUIRED'].includes(detailComplaint.status) && (
              <Button onClick={() => handleClaim(detailComplaint)} disabled={claimComplaint.isPending}>
                {claimComplaint.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    {detailComplaint.status === 'FOLLOW_UP_REQUIRED' ? (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {detailComplaint.status === 'FOLLOW_UP_REQUIRED' ? 'Tangani Lagi' : 'Terima untuk Diproses'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!decisionComplaint}
        onOpenChange={(open) => {
          if (!open) closeDecisionDialog();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keputusan Komplen</DialogTitle>
            <DialogDescription>
              Pilih penyelesaian yang paling sesuai. Flow baru tidak memakai Tiket Retur lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="font-semibold">{decisionComplaint?.complaintNumber}</div>
              <div>{decisionComplaint?.saleNumberSnapshot} • {decisionComplaint?.customerNameSnapshot || '-'}</div>
              <div className="text-muted-foreground">{decisionComplaint?.reason}</div>
            </div>
            <div className="space-y-2">
              <Label>Keputusan</Label>
              <Select value={decisionType} onValueChange={(value) => setDecisionType(value as ComplaintResolutionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEND_COMPONENT">Kirim Komponen / Pengganti</SelectItem>
                  <SelectItem value="CONVERT_TO_RETURN">Masuk Retur</SelectItem>
                  <SelectItem value="SETTLEMENT_DEDUCTION">Kena Potongan Marketplace</SelectItem>
                  <SelectItem value="NO_ACTION">Selesai Tanpa Tindakan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {decisionType === 'SETTLEMENT_DEDUCTION' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><Label>Nominal Potongan</Label><Input type="number" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="0" /></div>
                <div className="space-y-2"><Label>Nominal Bersih Diterima</Label><Input type="number" value={netReceivedAmount} onChange={(e) => setNetReceivedAmount(e.target.value)} placeholder="0" /></div>
              </div>
            )}

            {decisionType === 'SEND_COMPONENT' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label>Produk / Komponen</Label><Select value={componentProductId} onValueChange={setComponentProductId}><SelectTrigger><SelectValue placeholder="Pilih produk/komponen" /></SelectTrigger><SelectContent>{componentProducts.map((product: any) => <SelectItem key={product.id} value={product.id}>{product.name} - Stok {product.stock}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Varian / Warna</Label><Input value={componentVariantName} onChange={(e) => setComponentVariantName(e.target.value)} placeholder="Opsional, contoh: Hitam" /></div>
                <div className="space-y-2"><Label>Qty</Label><Input type="number" min="1" value={componentQty} onChange={(e) => setComponentQty(e.target.value)} /></div>
                <div className="space-y-2"><Label>Jasa Kirim</Label><Input value={componentShippingService} onChange={(e) => setComponentShippingService(e.target.value)} placeholder="JNE/J&T/dll" /></div>
                <div className="space-y-2"><Label>Ongkir</Label><Input type="number" value={componentShippingCost} onChange={(e) => setComponentShippingCost(e.target.value)} /></div>
              </div>
            )}

            {decisionType === 'CONVERT_TO_RETURN' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><Label>Item Penjualan</Label><Select value={returnSaleItemId} onValueChange={setReturnSaleItemId}><SelectTrigger><SelectValue placeholder={decisionDetail.isLoading ? 'Memuat item...' : 'Pilih item'} /></SelectTrigger><SelectContent>{((decisionFullComplaint as any)?.sale?.items || []).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.product?.name || item.productId} {item.variantName ? `- ${item.variantName}` : ''} - Qty {item.quantity}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Qty Retur</Label><Input type="number" min="1" value={returnQty} onChange={(e) => setReturnQty(e.target.value)} /></div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Catatan / Alasan</Label>
              <Textarea rows={4} value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder="Tulis alasan keputusan supaya jelas untuk semua role" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDecisionDialog}>Batal</Button>
            <Button onClick={submitDecisionFlow} disabled={setDecision.isPending || recordDeduction.isPending || processComponent.isPending || convertToReturn.isPending}>Simpan Keputusan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!followUpComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setFollowUpComplaint(null);
            setFollowUpReason('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Belum Selesai</DialogTitle>
            <DialogDescription>
              Jelaskan alasan kenapa pengiriman pengganti belum menyelesaikan kasus ini. Komplen akan masuk kembali ke PUSAT sebagai Perlu Tindak Lanjut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              No Komplen: <strong>{followUpComplaint?.complaintNumber}</strong>
            </p>
            <div className="space-y-2">
              <Label>Alasan Belum Selesai *</Label>
              <Textarea
                rows={4}
                placeholder="Contoh: barang belum sampai, pengganti masih salah, atau masalah belum terselesaikan"
                value={followUpReason}
                onChange={(e) => setFollowUpReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimal 5 karakter.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFollowUpComplaint(null);
                setFollowUpReason('');
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleRequestFollowUp}
              disabled={followUpReason.trim().length < 5 || requestComplaintFollowUp.isPending}
            >
              {requestComplaintFollowUp.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Tindak Lanjut'
              )}
            </Button>
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
            <p>Jenis Komplen: <strong>{getComplaintTypeLabel(complaintType || null)}</strong></p>
            <div className="rounded-md border p-3 space-y-1">
              <p className="font-semibold">Detail Penerima Pengganti</p>
              <p>Nama Penerima: <strong>{recipientName || '-'}</strong></p>
              <p>No HP: <strong>{recipientPhone || '-'}</strong></p>
              <p>Alamat: {recipientAddress || '-'}</p>
              {recipientAddressNote.trim() && <p>Catatan: {recipientAddressNote}</p>}
            </div>
            <p>Alasan: {reason}</p>
            <p>Resi PDF: <strong>Auto Generate dari Informasi Penjualan</strong></p>
            {cleanSalesInformation && <p>Informasi Penjualan: {cleanSalesInformation}</p>}
            {previewPhotoUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previewPhotoUrls.map((url, index) => (
                  <PreviewableImage
                    key={url}
                    src={url}
                    alt={`Preview komplen ${index + 1}`}
                    className="h-40 w-full"
                    imageClassName="object-contain"
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
