'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSales, useDeleteSale } from '@/lib/hooks/useSales';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, Loader2, AlertTriangle, Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatStatus } from '@/lib/utils/format';
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from '@/lib/utils/exportUtils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CancelSaleDialog } from '@/components/sales/CancelSaleDialog';


export default function SalesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  if (user?.role === 'TCP') {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border shadow-lg max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">Akses Ditolak</h3>
                    <p className="text-muted-foreground mt-2">
                        Kamu tidak mempunyai akses ke fitur itu.
                    </p>
                </div>
                <Button onClick={() => router.push('/')} variant="default" className="w-full">
                    Kembali ke Dashboard
                </Button>
            </div>
        </div>
    );
  }

  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = useSales({ status: statusFilter || undefined }, { enabled: user?.role !== 'TCP' });
  const deleteMutation = useDeleteSale();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);

  const sales = data?.data?.sales || [];

  const handleDelete = (id: string) => {
    setSaleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
      setSaleToDelete(null);
    }
  };

  const handleExportToExcel = async () => {
    if (!sales || sales.length === 0) {
      return;
    }

    const exportData = sales.map((sale: any) => ({
      'No. Penjualan': sale.saleNumber,
      'Tanggal': formatDateForExport(sale.saleDate),
      'Pelanggan': sale.customerName || 'Pelanggan Umum',
      'Platform': formatStatus(sale.platform),
      'Pembayaran': formatStatus(sale.paymentMethod),
      'Total': formatCurrencyForExport(sale.totalAmount),
      'Biaya Ongkir': formatCurrencyForExport(sale.shippingCost || 0),
      'Status': formatStatus(sale.status),
      'Catatan': sale.notes || '-',
    }));

    await exportToExcel(
      exportData,
      [
        { header: 'No. Penjualan', key: 'No. Penjualan', width: 18 },
        { header: 'Tanggal', key: 'Tanggal', width: 15 },
        { header: 'Pelanggan', key: 'Pelanggan', width: 25 },
        { header: 'Platform', key: 'Platform', width: 15 },
        { header: 'Pembayaran', key: 'Pembayaran', width: 15 },
        { header: 'Total', key: 'Total', width: 18 },
        { header: 'Biaya Ongkir', key: 'Biaya Ongkir', width: 15 },
        { header: 'Status', key: 'Status', width: 12 },
        { header: 'Catatan', key: 'Catatan', width: 30 },
      ],
      `Penjualan_${new Date().toISOString().split('T')[0]}`,
      'Daftar Penjualan'
    );
  };


  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const getStatusBadge = (status: string, isCancelPending?: boolean) => {
    if (isCancelPending) {
      return <Badge variant="secondary">Menunggu Persetujuan Pembatalan</Badge>;
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      PENDING: 'secondary',
      COMPLETED: 'default',
      WAITING_APPROVAL: 'secondary',
      APPROVED: 'default',
      CANCELLED: 'destructive',
      SETTLED: 'default',
      PROCESSED: 'default',
    };
    
    let translatedStatus = formatStatus(status);
    if (status === 'COMPLETED') translatedStatus = 'Selesai';
    if (status === 'PENDING') translatedStatus = 'Menunggu';
    if (status === 'CANCELLED') translatedStatus = 'Dibatalkan';
    if (status === 'SETTLED') translatedStatus = 'Disetorkan';
    if (status === 'PROCESSED') translatedStatus = 'Diproses';
    if (status === 'WAITING_APPROVAL') translatedStatus = 'Menunggu Proses/Packing';
    if (status === 'APPROVED') translatedStatus = 'Disetujui';

    return <Badge variant={variants[status] || 'default'}>{translatedStatus}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan' }]} />
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Pesanan Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola transaksi penjualan barang.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={!sales || sales.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Link href="/sales/new">
            <Button className="tour-sales-add">
              <Plus className="mr-2 h-4 w-4" />
              Penjualan Baru
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-64">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                    <SelectValue placeholder="Filter berdasarkan status" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="PENDING">Menunggu</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                    <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3 animate-in fade-in-50">
                {isLoading ? (
                    <div className="py-8 text-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <p className="text-muted-foreground">Tidak ada penjualan ditemukan</p>
                    </div>
                ) : (
                    sales.map((sale: any, index: number) => (
                        <div key={sale.id} className="rounded-lg border bg-card p-2.5 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-1.5">
                                <div>
                                    <div className="font-mono font-bold text-[12px] tracking-tight">NO. {index + 1}</div>
                                    <div className="text-[10px] text-muted-foreground">{format(new Date(sale.saleDate), 'dd MMM yyyy')}</div>
                                </div>
                                <div className="scale-75 origin-top-right">
                                    {getStatusBadge(sale.status, sale.isCancelPending)}
                                </div>
                            </div>

                            <div className="space-y-0.5 mb-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Pelanggan:</span>
                                    <span className="font-medium text-right truncate max-w-[150px]">{sale.customerName || 'Pelanggan Umum'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-muted-foreground">Platform:</span>
                                    <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">{formatStatus(sale.platform)}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-muted-foreground">Pembayaran:</span>
                                    <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">{formatStatus(sale.paymentMethod)}</Badge>
                                </div>
                            </div>

                            <div className="pt-1.5 border-t flex items-center justify-between mb-2">
                                <span className="text-[10px] text-muted-foreground">Total</span>
                                <span className="font-bold text-[12px]">{formatCurrency(sale.totalAmount)}</span>
                            </div>

                            <div className="grid grid-cols-4 gap-1">
                                <Link href={`/sales/${sale.id}`} className="col-span-2">
                                    <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">
                                        <Eye className="h-3 w-3 mr-1.5" />
                                        Detail
                                    </Button>
                                </Link>
                                
                                {sale.status === 'PENDING' ? (
                                    <>
                                        <Link href={`/sales/${sale.id}/edit`} className="col-span-1">
                                            <Button variant="outline" size="sm" className="w-full h-7">
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full h-7 col-span-1"
                                            onClick={() => handleDelete(sale.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </>
                                ) : (
                                    user?.role === 'USER' && !['CANCELLED', 'COMPLETED', 'SETTLED', 'PROCESSED', 'APPROVED'].includes(sale.status) && !sale.isCancelPending ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full h-7 col-span-2"
                                            onClick={() => {
                                                setSaleToCancel(sale.id);
                                                setCancelDialogOpen(true);
                                            }}
                                        >
                                            Ajukan Batal
                                        </Button>
                                    ) : (
                                        <div className="col-span-2"></div>
                                    )
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms] tour-sales-list">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>No. Penjualan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead className="text-right">Total Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Memuat data...</p>
                          </div>
                        </TableCell>
                    </TableRow>
                    ) : sales.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Tidak ada penjualan ditemukan
                        </TableCell>
                    </TableRow>
                    ) : (
                    sales.map((sale: any, index: number) => (
                        <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">NO. {index + 1}</TableCell>
                        <TableCell>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{sale.customerName || 'Pelanggan Umum'}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{formatStatus(sale.platform)}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{formatStatus(sale.paymentMethod)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                            {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(sale.status, sale.isCancelPending)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                            <Link href={`/sales/${sale.id}`}>
                                <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                                </Button>
                            </Link>
                            {sale.status === 'PENDING' && (
                                <>
                                <Link href={`/sales/${sale.id}/edit`}>
                                    <Button variant="ghost" size="sm">
                                    <Pencil className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(sale.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                                </>
                            )}
                            {user?.role === 'USER' && !['CANCELLED', 'COMPLETED', 'SETTLED', 'PROCESSED', 'APPROVED'].includes(sale.status) && !sale.isCancelPending && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        setSaleToCancel(sale.id);
                                        setCancelDialogOpen(true);
                                    }}
                                >
                                    Ajukan Batal
                                </Button>
                            )}
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Penjualan"
        description="Apakah Anda yakin ingin menghapus penjualan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />

      <CancelSaleDialog 
        open={cancelDialogOpen} 
        onOpenChange={setCancelDialogOpen} 
        saleId={saleToCancel} 
      />
    </div>

  );
}
