'use client';

import { useProductRequests, useChangeRequests } from '@/lib/hooks/useRequests';
import {
  useSettlementConfirmationRequests,
  useApproveSettlementConfirmation,
  useRejectSettlementConfirmation,
} from '@/lib/hooks/useSettlements';
import { useAuth } from '@/lib/hooks/useAuth';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Eye, Package, Tag, Users, ShoppingBag, FileX, ToggleLeft, ClipboardList, AlertCircle, Wallet, Copy, Search, Filter, BadgeDollarSign } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DiffViewer } from '@/components/approvals/DiffViewer';
import { ChangeRequest } from '@/types';
import { formatRoleLabel } from '@/lib/utils/roleLabel';
import { FormFieldError, FormValidationSummary, errorInputClass } from '@/components/forms/FormValidationFeedback';
import { cn } from '@/lib/utils';

const parsePayload = (payload: any): any => {
  if (typeof payload !== 'string') return payload;
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed === 'string') return parsePayload(parsed);
    return parsed;
  } catch (e) {
    return payload;
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMonthEndWarningInfo() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(endOfMonth.getFullYear(), endOfMonth.getMonth(), endOfMonth.getDate()).getTime();
  const daysLeft = Math.max(Math.round((end - today) / (1000 * 60 * 60 * 24)), 0);

  return {
    isActive: daysLeft <= 3,
    isCritical: daysLeft <= 1,
    daysLeft,
    endDateText: endOfMonth.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  };
}

type RequestMeta = {
  label: string;           // Judul singkat
  description: string;     // Penjelasan detail
  sub?: string;            // Info tambahan (nama/nomor)
  icon: React.ElementType;
  badgeColor: string;
};

function getRequestMeta(req: ChangeRequest): RequestMeta {
  const payload = parsePayload(req.payload) || {};

  if (req.entityType === 'SALE' && req.requestType === 'DELETE') {
    return {
      label: 'Pembatalan Penjualan',
      description: 'Pengguna mengajukan pembatalan transaksi penjualan yang sudah dibuat.',
      sub: payload.saleNumber || payload.saleId || req.entityId,
      icon: FileX,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (req.entityType === 'SETTLEMENT' && req.requestType === 'DELETE') {
    return {
      label: 'Pembatalan Pelunasan',
      description: 'Pengguna mengajukan pembatalan data pelunasan yang sudah dicatat.',
      sub: payload.saleNumber ? `No. ${payload.saleNumber}` : undefined,
      icon: FileX,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (req.entityType === 'SALE' && req.requestType === 'CREATE') {
    return {
      label: 'Pengajuan Penjualan Baru',
      description: 'Pengguna mengajukan pembuatan transaksi penjualan baru untuk disetujui.',
      sub: payload.saleNumber,
      icon: ShoppingBag,
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
    };
  }
  if (req.entityType === 'PRODUCT' && req.requestType === 'CREATE') {
    return {
      label: 'Tambah Produk Baru',
      description: 'Pengguna mengajukan penambahan produk baru ke dalam sistem inventaris.',
      sub: payload.name || payload.sku,
      icon: Package,
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
    };
  }
  if (req.entityType === 'PRODUCT' && req.requestType === 'UPDATE') {
    if (payload.__requestKind === 'PRICE_UPDATE') {
      return {
        label: 'Pengajuan Perubahan Harga',
        description: 'Pengguna mengajukan perubahan harga produk. Harga baru diterapkan setelah Admin menyetujui.',
        sub: payload.name || payload.sku,
        icon: BadgeDollarSign,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    return {
      label: 'Ubah Data Produk',
      description: 'Pengguna mengajukan perubahan pada data produk yang sudah ada (nama, harga, stok, dll).',
      sub: payload.name || payload.sku,
      icon: Package,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }
  if (req.entityType === 'PRODUCT' && req.requestType === 'DELETE') {
    return {
      label: 'Hapus Produk',
      description: 'Pengguna mengajukan penghapusan produk dari sistem inventaris.',
      sub: payload.name || payload.sku,
      icon: Package,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (req.entityType === 'CATEGORY' && req.requestType === 'CREATE') {
    return {
      label: 'Tambah Kategori Baru',
      description: 'Pengguna mengajukan penambahan kategori produk baru.',
      sub: payload.name,
      icon: Tag,
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
    };
  }
  if (req.entityType === 'CATEGORY' && req.requestType === 'UPDATE') {
    return {
      label: 'Ubah Data Kategori',
      description: 'Pengguna mengajukan perubahan pada data kategori yang sudah ada.',
      sub: payload.name,
      icon: Tag,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }
  if (req.entityType === 'CATEGORY' && req.requestType === 'DELETE') {
    return {
      label: 'Hapus Kategori',
      description: 'Pengguna mengajukan penghapusan kategori dari sistem.',
      sub: payload.name,
      icon: Tag,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (req.entityType === 'SUPPLIER' && req.requestType === 'CREATE') {
    return {
      label: 'Tambah Supplier Baru',
      description: 'Pengguna mengajukan penambahan data supplier/pemasok baru.',
      sub: payload.name,
      icon: Users,
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
    };
  }
  if (req.entityType === 'SUPPLIER' && req.requestType === 'UPDATE') {
    return {
      label: 'Ubah Data Supplier',
      description: 'Pengguna mengajukan perubahan pada data supplier yang sudah ada.',
      sub: payload.name,
      icon: Users,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }
  if (req.entityType === 'SUPPLIER' && req.requestType === 'DELETE') {
    return {
      label: 'Hapus Supplier',
      description: 'Pengguna mengajukan penghapusan data supplier dari sistem.',
      sub: payload.name,
      icon: Users,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (req.entityType === 'STOCK') {
    const isOut = payload.type === 'OUT';
    return {
      label: isOut ? 'Penyesuaian Stok Keluar' : 'Penyesuaian Stok Masuk',
      description: isOut
        ? `Pengguna mengajukan pengurangan stok sebesar ${payload.quantity || '?'} unit.`
        : `Pengguna mengajukan penambahan stok sebesar ${payload.quantity || '?'} unit.`,
      sub: payload.notes || undefined,
      icon: Package,
      badgeColor: isOut ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200',
    };
  }
  // Fallback
  const typeLabel: Record<string, string> = { CREATE: 'Tambah', UPDATE: 'Ubah', DELETE: 'Hapus' };
  return {
    label: `${typeLabel[req.requestType] || req.requestType} ${req.entityType}`,
    description: 'Permintaan perubahan data yang memerlukan persetujuan.',
    sub: req.entityId || undefined,
    icon: ClipboardList,
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('master');
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';
  const { pendingRequests: masterRequests } = useChangeRequests({ enabled: isAdmin });
  const { pendingRequests: statusRequests } = useProductRequests({ enabled: isAdmin });

  const masterCount = masterRequests.data?.data?.length || 0;
  const statusCount = statusRequests.data?.data?.length || 0;

  if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'DEV') {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Persetujuan</h1>
        <p className="text-muted-foreground mt-1">
          Tinjau dan kelola semua permintaan yang memerlukan persetujuan Admin.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-orange-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Perubahan Data Master
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{masterCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              permintaan perubahan produk, kategori, supplier, penjualan, pelunasan
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ToggleLeft className="h-4 w-4" />
              Perubahan Status Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{statusCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              permintaan aktivasi atau deaktivasi produk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="master" className="relative">
            Perubahan Data Master
            {masterCount > 0 && (
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                {masterCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="status" className="relative">
            Status Produk
            {statusCount > 0 && (
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500 px-1.5 text-[11px] font-bold text-white">
                {statusCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="master">
          <MasterApprovals />
        </TabsContent>

        <TabsContent value="status">
          <StatusApprovals />
        </TabsContent>

        {false && <TabsContent value="settlements">
          <SettlementConfirmationApprovals />
        </TabsContent>}
      </Tabs>
    </div>
  );
}

// ─── Master Approvals ──────────────────────────────────────────────────────────

function MasterApprovals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';
  const { pendingRequests, approveRequest, rejectRequest } = useChangeRequests({ enabled: isAdmin });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitAttempted, setRejectSubmitAttempted] = useState(false);

  const handleApprove = (id: string) => {
    approveRequest.mutate(id, {
      onSuccess: () => {
        toast.success('Permintaan disetujui');
        setDetailOpen(false);
      },
      onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyetujui permintaan'),
    });
  };

  const openRejectDialog = (req: ChangeRequest) => {
    setSelectedRequest(req);
    setRejectReason('');
    setRejectSubmitAttempted(false);
    setRejectOpen(true);
  };

  const openDetailDialog = (req: ChangeRequest) => {
    setSelectedRequest(req);
    setDetailOpen(true);
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    rejectRequest.mutate(
      { id: selectedRequest.id, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Permintaan ditolak');
          setRejectOpen(false);
          setDetailOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menolak permintaan'),
      }
    );
  };

  const requests = pendingRequests.data?.data || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            Permintaan Perubahan Data Master
            <Badge variant="outline" className="ml-auto text-orange-600 border-orange-300 bg-orange-50">
              {requests.length} Pending
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 space-y-1">
            <span className="block text-sm">
              Daftar permintaan yang diajukan pengguna untuk <strong>menambah, mengubah, atau menghapus</strong> data pada sistem.
            </span>
            <span className="text-xs text-muted-foreground">
              Mencakup: Produk · Kategori · Supplier · Penjualan · Pelunasan
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[160px]">Tanggal Pengajuan</TableHead>
                <TableHead>Jenis Permintaan</TableHead>
                <TableHead>Diajukan Oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-60" />
                    <p className="font-medium">Semua permintaan sudah diproses</p>
                    <p className="text-xs mt-1 opacity-60">Tidak ada permintaan data master yang menunggu persetujuan</p>
                  </TableCell>
                </TableRow>
              ) : (
                (requests as ChangeRequest[]).map((req) => {
                  const meta = getRequestMeta(req);
                  const Icon = meta.icon;
                  const canReject = !(req.requestType === 'DELETE' && (req.entityType === 'SALE' || req.entityType === 'SETTLEMENT'));
                  return (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">
                        <div className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy', { locale: idLocale })}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(req.createdAt), 'HH:mm')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-lg p-2 ${meta.badgeColor.replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{meta.label}</span>
                              <Badge className={`text-[10px] px-1.5 py-0 border ${meta.badgeColor}`} variant="outline">
                                {req.requestType === 'DELETE' ? 'Hapus' : req.requestType === 'CREATE' ? 'Baru' : 'Ubah'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                            {meta.sub && (
                              <span className="text-xs font-medium text-primary/80 mt-0.5 block">→ {meta.sub}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{req.requester?.fullName || req.requester?.username}</div>
                        <div className="text-xs text-muted-foreground">{formatRoleLabel(req.requester?.role)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetailDialog(req)}
                            className="h-8 px-2 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Detail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => handleApprove(req.id)}
                            disabled={approveRequest.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Setuju
                          </Button>
                          {canReject && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => openRejectDialog(req)}
                              disabled={rejectRequest.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Tolak
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detail Permintaan
            </DialogTitle>
            <DialogDescription>
              Tinjau detail lengkap permintaan sebelum menyetujui atau menolak.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (() => {
            const meta = getRequestMeta(selectedRequest);
            const Icon = meta.icon;
            const canReject = !(selectedRequest.requestType === 'DELETE' && (selectedRequest.entityType === 'SALE' || selectedRequest.entityType === 'SETTLEMENT'));
            return (
              <div className="space-y-5">
                {/* Info box */}
                <div className={`rounded-xl border p-4 ${meta.badgeColor.replace('text-', 'text-').replace('bg-', 'bg-')} bg-opacity-20`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm">{meta.label}</div>
                      <div className="text-sm mt-0.5">{meta.description}</div>
                      {meta.sub && <div className="text-xs font-semibold mt-1">Nama/Nomor: {meta.sub}</div>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground block mb-1">Tipe Data</span>
                    <Badge variant="outline">{selectedRequest.entityType}</Badge>
                  </div>
                  <div>
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground block mb-1">Tipe Aksi</span>
                    <Badge className={meta.badgeColor} variant="outline">
                      {selectedRequest.requestType === 'DELETE' ? 'Hapus' : selectedRequest.requestType === 'CREATE' ? 'Tambah Baru' : 'Ubah Data'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground block mb-1">Diajukan Oleh</span>
                    <div className="font-medium">{selectedRequest.requester?.fullName}</div>
                    <div className="text-xs text-muted-foreground">{formatRoleLabel(selectedRequest.requester?.role)}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground block mb-1">Tanggal</span>
                    <div>{format(new Date(selectedRequest.createdAt), 'dd MMM yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(selectedRequest.createdAt), 'HH:mm')}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Data yang Diajukan
                  </h4>
                  <DiffViewer
                    newData={parsePayload(selectedRequest.payload)}
                    type={selectedRequest.requestType}
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
            {selectedRequest && (() => {
              const canReject = !(selectedRequest.requestType === 'DELETE' && (selectedRequest.entityType === 'SALE' || selectedRequest.entityType === 'SETTLEMENT'));
              return (
                <>
                  {canReject && (
                    <Button
                      variant="destructive"
                      onClick={() => { setDetailOpen(false); openRejectDialog(selectedRequest); }}
                      disabled={rejectRequest.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Tolak
                    </Button>
                  )}
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={approveRequest.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    {approveRequest.isPending ? 'Menyetujui...' : 'Setujui'}
                  </Button>
                </>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!open) setRejectSubmitAttempted(false); setRejectOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Tolak Permintaan
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (() => {
                const meta = getRequestMeta(selectedRequest);
                return <span>Anda akan menolak: <strong>{meta.label}</strong>{meta.sub ? ` — ${meta.sub}` : ''}.</span>;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <FormValidationSummary show={rejectSubmitAttempted && !rejectReason.trim()} fields={["Alasan Penolakan"]} />
            <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan permintaan ini secara spesifik..."
              className={cn('mt-2', rejectSubmitAttempted && !rejectReason.trim() && errorInputClass)}
              aria-invalid={rejectSubmitAttempted && !rejectReason.trim()}
              rows={3}
            />
            {rejectSubmitAttempted && !rejectReason.trim() && <FormFieldError message="Isi alasan penolakan." />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectSubmitAttempted(false); setRejectOpen(false); }}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Menolak...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Settlement Confirmation Approvals ─────────────────────────────────────────

function SettlementConfirmationApprovals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [requestStatus, setRequestStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    invoiceNumber: '',
    customerName: '',
    grossAmount: '',
    netAmount: '',
    difference: '',
    settlementDate: '',
    requestedBy: '',
  });
  const { data, isLoading } = useSettlementConfirmationRequests(
    {
      page,
      limit,
      status: requestStatus,
      search: search.trim() || undefined,
      invoiceNumber: filters.invoiceNumber.trim() || undefined,
      customerName: filters.customerName.trim() || undefined,
      grossAmount: filters.grossAmount.trim() || undefined,
      netAmount: filters.netAmount.trim() || undefined,
      difference: filters.difference.trim() || undefined,
      settlementDate: filters.settlementDate.trim() || undefined,
      requestedBy: filters.requestedBy.trim() || undefined,
    },
    { enabled: isAdmin }
  );
  const approveMutation = useApproveSettlementConfirmation();
  const rejectMutation = useRejectSettlementConfirmation();
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSubmitAttempted, setRejectSubmitAttempted] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

  const requests = (data as any)?.data?.requests || [];
  const pagination = (data as any)?.data?.pagination || { total: 0, page, limit, totalPages: 1 };
  const hasFilters = search.trim() || Object.values(filters).some((value) => value.trim());
  const monthEndWarning = getMonthEndWarningInfo();
  const showMonthEndWarning = monthEndWarning.isActive && pagination.total > 0;
  const isPendingView = requestStatus === 'PENDING';

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setFilters({
      invoiceNumber: '',
      customerName: '',
      grossAmount: '',
      netAmount: '',
      difference: '',
      settlementDate: '',
      requestedBy: '',
    });
    setActiveFilter(null);
    setPage(1);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(Math.max(nextLimit, 50));
    setPage(1);
  };

  const formatCurrency = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number.isNaN(numeric) ? 0 : numeric);
  };

  const filterFields = [
    { key: 'invoiceNumber', label: 'No Invoice', placeholder: 'Cari invoice...' },
    { key: 'customerName', label: 'Pelanggan', placeholder: 'Cari nama / HP...' },
    { key: 'grossAmount', label: 'Total Kotor', placeholder: 'Contoh: 150000' },
    { key: 'netAmount', label: 'Dana Bersih', placeholder: 'Contoh: 145000' },
    { key: 'difference', label: 'Selisih', placeholder: 'Contoh: 5000' },
    { key: 'settlementDate', label: 'Tgl Pelunasan', placeholder: 'YYYY-MM-DD / dd/mm' },
    { key: 'requestedBy', label: 'Diajukan Oleh', placeholder: 'Cari nama / email...' },
  ] as const;

  const renderFilterHead = (field: (typeof filterFields)[number], className = '') => {
    const isActive = activeFilter === field.key;
    const value = filters[field.key];
    return (
      <TableHead className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 px-2 -ml-2 text-xs font-semibold ${className.includes('text-right') ? 'ml-auto -mr-2' : ''}`}
          onClick={() => setActiveFilter(isActive ? null : field.key)}
        >
          <span>{field.label}</span>
          <Filter className={`ml-1 h-3.5 w-3.5 ${value ? 'text-green-600' : 'text-muted-foreground'}`} />
        </Button>
      </TableHead>
    );
  };

  const handleCopyInvoice = async (invoiceNumber: string) => {
    if (!invoiceNumber) return;
    await navigator.clipboard.writeText(invoiceNumber);
    setCopiedInvoice(invoiceNumber);
    toast.success('No invoice berhasil disalin');
    window.setTimeout(() => setCopiedInvoice(null), 1500);
  };

  const handleReject = () => {
    setRejectSubmitAttempted(true);
    if (!rejectRequestId || !rejectNotes.trim()) {
      toast.error('Lengkapi dulu: Alasan Penolakan');
      return;
    }
    rejectMutation.mutate(
      { id: rejectRequestId, reviewNotes: rejectNotes },
      {
        onSuccess: () => {
          setRejectRequestId(null);
          setRejectNotes('');
          setRejectSubmitAttempted(false);
        },
      }
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Konfirmasi Pelunasan
            <Badge variant="outline" className="ml-auto text-green-600 border-green-300 bg-green-50">
              {pagination.total} {requestStatus === 'ALL' ? 'Data' : requestStatus === 'PENDING' ? 'Pending' : requestStatus === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 space-y-1">
            <span className="block text-sm">
              Daftar pengajuan pelunasan dari USER. Pelunasan baru tercatat resmi setelah Admin/Super Admin menekan <strong>Konfirmasi</strong>.
            </span>
            <span className="text-xs text-muted-foreground">
              Saat dikonfirmasi, sistem membuat data pelunasan dan mengubah penjualan menjadi Sudah Dilunasi.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {showMonthEndWarning && isPendingView && (
            <div
              className={`mx-4 mb-4 rounded-xl border-2 p-4 ${
                monthEndWarning.isCritical
                  ? 'border-red-600 bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100'
                  : 'border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className={`mt-0.5 h-6 w-6 shrink-0 ${monthEndWarning.isCritical ? 'text-red-700 dark:text-red-200' : 'text-orange-700 dark:text-orange-200'}`} />
                <div>
                  <p className="font-black uppercase">
                    Jangan lewat akhir bulan — {pagination.total} pelunasan masih menunggu konfirmasi
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Batas akhir bulan {monthEndWarning.endDateText}.
                    {monthEndWarning.daysLeft === 0
                      ? ' Hari ini hari terakhir, selesaikan sekarang.'
                      : ` Sisa ${monthEndWarning.daysLeft} hari, selesaikan sebelum tutup bulan.`}
                  </p>
                  <p className="mt-1 text-xs">
                    Jika dibiarkan, laporan bulan ini bisa terlihat belum lengkap karena pelunasan masih menggantung di antrian.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="border-t border-b bg-muted/10 p-4 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari semua: invoice, pelanggan, nominal, tanggal, pengaju..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
                  {[
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'APPROVED', label: 'Disetujui' },
                    { value: 'REJECTED', label: 'Ditolak' },
                    { value: 'ALL', label: 'Semua' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      variant={requestStatus === item.value ? 'default' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setRequestStatus(item.value as typeof requestStatus);
                        setPage(1);
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                <span>Minimal 50 data per halaman</span>
                {hasFilters && (
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                    Reset filter
                  </Button>
                )}
              </div>
            </div>
            {activeFilter && (() => {
              const field = filterFields.find((item) => item.key === activeFilter);
              if (!field) return null;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <Label className="text-xs font-semibold">Filter {field.label}</Label>
                  <Input
                    value={filters[field.key]}
                    onChange={(event) => updateFilter(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="mt-2"
                  />
                </div>
              );
            })()}
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {renderFilterHead(filterFields[0])}
                {renderFilterHead(filterFields[1])}
                {renderFilterHead(filterFields[2], 'text-right')}
                {renderFilterHead(filterFields[3], 'text-right')}
                {renderFilterHead(filterFields[4], 'text-right')}
                {renderFilterHead(filterFields[5])}
                {renderFilterHead(filterFields[6])}
                <TableHead>Status / Review</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Memuat pengajuan pelunasan...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-60" />
                    <p className="font-medium">
                      {isPendingView ? 'Semua pelunasan sudah dikonfirmasi' : 'Tidak ada riwayat pada status ini'}
                    </p>
                    <p className="text-xs mt-1 opacity-60">
                      {isPendingView ? 'Tidak ada pengajuan pelunasan yang menunggu persetujuan' : 'Coba pilih status lain atau reset filter'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request: any) => {
                  const sale = request.sale;
                  const invoiceNumber = sale?.saleNumber || request.invoiceNumber || '-';
                  const gross = parseFloat(sale?.totalAmount || '0');
                  const net = parseFloat(request.netAmount || '0');
                  const difference = Math.max(gross - net, 0);

                  return (
                    <TableRow key={request.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{invoiceNumber}</span>
                          {invoiceNumber !== '-' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleCopyInvoice(invoiceNumber)}
                              title="Copy No Invoice"
                            >
                              {copiedInvoice === invoiceNumber ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{sale?.customerName || '-'}</div>
                        <div className="text-xs text-muted-foreground">{sale?.customerPhone || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(gross)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatCurrency(net)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(difference)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(request.settlementDate).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-muted-foreground">
                          diajukan {format(new Date(request.createdAt), 'dd MMM HH:mm', { locale: idLocale })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{request.requester?.fullName || '-'}</div>
                        <div className="text-xs text-muted-foreground">{request.requester?.email || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {request.status === 'APPROVED' ? (
                            <Badge className="bg-green-600">Disetujui</Badge>
                          ) : request.status === 'REJECTED' ? (
                            <Badge variant="destructive">Ditolak</Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500 text-blue-600">Pending</Badge>
                          )}
                          {request.reviewedAt && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(request.reviewedAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                            </div>
                          )}
                          {(request.reviewer?.fullName || request.reviewNotes) && (
                            <div className="text-xs">
                              {request.reviewer?.fullName && <div>Oleh: <span className="font-medium">{request.reviewer.fullName}</span></div>}
                              {request.reviewNotes && <div className="text-muted-foreground line-clamp-2">{request.reviewNotes}</div>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {request.status === 'PENDING' ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => approveMutation.mutate({ id: request.id })}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Konfirmasi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => {
                                  setRejectRequestId(request.id);
                                  setRejectNotes('');
                                  setRejectSubmitAttempted(false);
                                }}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Tolak
                              </Button>
                            </>
                          ) : request.settlementId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => window.location.href = `/settlements/${request.settlementId}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Detail
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Selesai</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
          <Pagination
            currentPage={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total || 0}
            itemsPerPage={pagination.limit || limit}
            onPageChange={setPage}
            onItemsPerPageChange={handleLimitChange}
            pageSizeOptions={[50, 100, 200]}
          />
        </CardContent>
      </Card>

      <Dialog open={!!rejectRequestId} onOpenChange={(open) => {
        if (!open) {
          setRejectRequestId(null);
          setRejectNotes('');
          setRejectSubmitAttempted(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Tolak Pengajuan Pelunasan
            </DialogTitle>
            <DialogDescription>
              Isi alasan agar user tahu apa yang perlu diperbaiki sebelum mengajukan ulang.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <FormValidationSummary show={rejectSubmitAttempted && !rejectNotes.trim()} fields={["Alasan Penolakan"]} />
            <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Contoh: Nominal dana bersih belum sesuai mutasi rekening."
              className={cn('mt-2', rejectSubmitAttempted && !rejectNotes.trim() && errorInputClass)}
              aria-invalid={rejectSubmitAttempted && !rejectNotes.trim()}
              rows={3}
            />
            {rejectSubmitAttempted && !rejectNotes.trim() && <FormFieldError message="Isi alasan penolakan." />}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectRequestId(null);
                setRejectNotes('');
                setRejectSubmitAttempted(false);
              }}
              disabled={rejectMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Menolak...' : 'Tolak Pengajuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Status Approvals ──────────────────────────────────────────────────────────

function StatusApprovals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DEV';
  const { pendingRequests, approveRequest, rejectRequest } = useProductRequests({ enabled: isAdmin });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitAttempted, setRejectSubmitAttempted] = useState(false);

  const handleApprove = (id: string) => {
    approveRequest.mutate(id, {
      onSuccess: () => toast.success('Status produk berhasil diperbarui'),
      onError: () => toast.error('Gagal menyetujui permintaan'),
    });
  };

  const openRejectDialog = (req: any) => {
    setSelectedId(req.id);
    setSelectedReq(req);
    setRejectReason('');
    setRejectSubmitAttempted(false);
    setRejectOpen(true);
  };

  const handleReject = () => {
    if (!selectedId) return;
    rejectRequest.mutate(
      { id: selectedId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success('Permintaan ditolak');
          setRejectOpen(false);
        },
        onError: () => toast.error('Gagal menolak permintaan'),
      }
    );
  };

  const requests = pendingRequests.data?.data || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToggleLeft className="h-5 w-5 text-purple-500" />
            Permintaan Perubahan Status Produk
            <Badge variant="outline" className="ml-auto text-purple-600 border-purple-300 bg-purple-50">
              {requests.length} Pending
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 space-y-1">
            <span className="block text-sm">
              Daftar permintaan <strong>aktivasi</strong> atau <strong>deaktivasi</strong> produk yang diajukan pengguna.
            </span>
            <span className="text-xs text-muted-foreground">
              Produk yang diaktifkan bisa dijual. Produk yang dinonaktifkan tidak akan muncul di daftar penjualan.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[160px]">Tanggal Pengajuan</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Diajukan Oleh</TableHead>
                <TableHead>Permintaan</TableHead>
                <TableHead>Alasan Pengajuan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-60" />
                    <p className="font-medium">Semua permintaan sudah diproses</p>
                    <p className="text-xs mt-1 opacity-60">Tidak ada permintaan status produk yang menunggu persetujuan</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req: any) => (
                  <TableRow key={req.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                      <div className="font-medium">{format(new Date(req.createdAt), 'dd MMM yyyy', { locale: idLocale })}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(req.createdAt), 'HH:mm')}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-muted p-1.5">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{req.product?.name}</div>
                          <div className="text-xs text-muted-foreground">SKU: {req.product?.sku || '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{req.requester?.fullName || req.requester?.username}</div>
                      <div className="text-xs text-muted-foreground">{formatRoleLabel(req.requester?.role)}</div>
                    </TableCell>
                    <TableCell>
                      {req.requestedStatus === 'ACTIVE' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                          <div>
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs" variant="outline">
                              Jadikan AKTIF
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Produk bisa dijual ke pelanggan</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
                          <div>
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs" variant="outline">
                              Jadikan NONAKTIF
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Produk tidak bisa dijual sementara</p>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-sm truncate" title={req.reason}>{req.reason || <span className="text-muted-foreground italic text-xs">Tidak ada alasan</span>}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                          onClick={() => handleApprove(req.id)}
                          disabled={approveRequest.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Setuju
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => openRejectDialog(req)}
                          disabled={rejectRequest.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!open) setRejectSubmitAttempted(false); setRejectOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Tolak Permintaan Status
            </DialogTitle>
            <DialogDescription>
              {selectedReq && (
                <span>
                  Anda akan menolak permintaan{' '}
                  <strong>{selectedReq.requestedStatus === 'ACTIVE' ? 'aktivasi' : 'deaktivasi'}</strong>{' '}
                  produk <strong>{selectedReq.product?.name}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <FormValidationSummary show={rejectSubmitAttempted && !rejectReason.trim()} fields={["Alasan Penolakan"]} />
            <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan mengapa permintaan ini ditolak..."
              className={cn('mt-2', rejectSubmitAttempted && !rejectReason.trim() && errorInputClass)}
              aria-invalid={rejectSubmitAttempted && !rejectReason.trim()}
              rows={3}
            />
            {rejectSubmitAttempted && !rejectReason.trim() && <FormFieldError message="Isi alasan penolakan." />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectSubmitAttempted(false); setRejectOpen(false); }}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Menolak...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
