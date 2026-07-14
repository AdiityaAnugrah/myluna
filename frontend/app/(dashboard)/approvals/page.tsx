'use client';

import { useProductRequests, useChangeRequests } from '@/lib/hooks/useRequests';
import { useAuth } from '@/lib/hooks/useAuth';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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
import { Loader2, CheckCircle, XCircle, Eye, Package, Tag, Users, ShoppingBag, FileX, ToggleLeft, ClipboardList, AlertCircle } from 'lucide-react';
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
      <Tabs defaultValue="master" className="space-y-4">
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
                        <div className="text-xs text-muted-foreground">{String(req.requester?.role || '')}</div>
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
                    <div className="text-xs text-muted-foreground">{String(selectedRequest.requester?.role || '')}</div>
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
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
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
          <div className="py-4">
            <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan permintaan ini secara spesifik..."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending || !rejectReason.trim()}
            >
              {rejectRequest.isPending ? 'Menolak...' : 'Tolak Permintaan'}
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
                      <div className="text-xs text-muted-foreground">{req.requester?.role}</div>
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
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
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
          <div className="py-4">
            <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan mengapa permintaan ini ditolak..."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending || !rejectReason.trim()}
            >
              {rejectRequest.isPending ? 'Menolak...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
