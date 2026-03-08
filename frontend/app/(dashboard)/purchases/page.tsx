'use client';

import { useState } from 'react';
import { usePurchases, useDeletePurchase } from '@/lib/hooks/usePurchases';
import { useAuthStore } from '@/lib/stores/auth';
import { useRouter } from 'next/navigation';
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
import { Plus, Pencil, Trash2, Eye, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ConfirmDialog';


export default function PurchasesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = usePurchases(
    { status: statusFilter || undefined }, 
    { enabled: user?.role !== 'TCP' }
  );
  const deleteMutation = useDeletePurchase();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

  const purchases = data?.data?.purchases || [];

  const handleDelete = (id: string) => {
    setPurchaseToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deleteMutation.mutate(purchaseToDelete);
      setPurchaseToDelete(null);
    }
  };
  
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


  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      PENDING: 'secondary',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Pembelian' }]} />
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Pesanan Pembelian</h1>
          <p className="text-muted-foreground mt-1">Kelola pesanan pembelian dari pemasok gudang.</p>
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Pembelian Baru
          </Button>
        </Link>
      </div>

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
        ) : purchases.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                <p className="text-muted-foreground text-xs">Tidak ada pembelian ditemukan</p>
            </div>
        ) : (
            purchases.map((purchase) => (
                <div key={purchase.id} className="rounded-lg border bg-card p-2.5 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-1.5">
                        <div>
                            <div className="font-mono font-bold text-[12px] tracking-tight">{purchase.purchaseNumber}</div>
                            <div className="text-[10px] text-muted-foreground">{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</div>
                        </div>
                        <div className="scale-75 origin-top-right">
                            {getStatusBadge(purchase.status)}
                        </div>
                    </div>

                    <div className="space-y-0.5 mb-2">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Pemasok:</span>
                            <span className="font-medium text-right truncate max-w-[150px]">{purchase.supplier?.name || '-'}</span>
                        </div>
                    </div>

                    <div className="pt-1.5 border-t flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground">Total Produk</span>
                        <span className="font-bold text-[12px]">
                            {purchase.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} barang
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                        <Link href={`/purchases/${purchase.id}`} className="col-span-2">
                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">
                                <Eye className="h-3 w-3 mr-1.5" />
                                Detail
                            </Button>
                        </Link>
                        
                        {purchase.status === 'PENDING' ? (
                            <>
                                <Link href={`/purchases/${purchase.id}/edit`} className="col-span-1">
                                    <Button variant="outline" size="sm" className="w-full h-7">
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full h-7 col-span-1"
                                    onClick={() => handleDelete(purchase.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </>
                        ) : (
                             <div className="col-span-2"></div>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Pembelian</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pemasok</TableHead>
              <TableHead className="text-right">Total Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Tidak ada pembelian ditemukan
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-mono text-sm">{purchase.purchaseNumber}</TableCell>
                  <TableCell>{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium">{purchase.supplier?.name || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {purchase.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} barang
                  </TableCell>
                  <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/purchases/${purchase.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {purchase.status === 'PENDING' && (
                        <>
                          <Link href={`/purchases/${purchase.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(purchase.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Pembelian"
        description="Apakah Anda yakin ingin menghapus pembelian ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />
    </div>

  );
}
