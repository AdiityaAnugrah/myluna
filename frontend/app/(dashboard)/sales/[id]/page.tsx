'use client';

import { useSale } from '@/lib/hooks/useSales';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancelSaleDialog } from '@/components/sales/CancelSaleDialog';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, FileText, Truck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { use } from 'react';
import { formatStatus } from '@/lib/utils/format';
import { getPdfUrl } from '@/lib/utils/sales';

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSale(id);
  const { user } = useAuthStore();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);

  const sale = data?.data;

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
    if (status === 'COMPLETED') translatedStatus = 'Selesai (Data Lama)';
    if (status === 'PENDING') translatedStatus = 'Menunggu';
    if (status === 'CANCELLED') translatedStatus = 'Dibatalkan';
    if (status === 'SETTLED') translatedStatus = 'Sudah Dilunasi';
    if (status === 'PROCESSED') translatedStatus = 'Diproses';
    if (status === 'WAITING_APPROVAL') translatedStatus = 'Menunggu Proses/Packing';
    if (status === 'APPROVED') translatedStatus = 'Disetujui';

    return <Badge variant={variants[status] || 'default'}>{translatedStatus}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Penjualan tidak ditemukan</p>
        <Link href="/sales">
          <Button className="mt-4">Kembali ke Penjualan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'Penjualan', href: '/sales' }, { label: sale.saleNumber }]}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detail Penjualan</h1>
            <p className="text-gray-600 mt-1">{sale.saleNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(sale.status, sale.isCancelPending)}
          {user?.role === 'USER' && !['CANCELLED', 'COMPLETED', 'SETTLED', 'PROCESSED', 'APPROVED'].includes(sale.status) && !sale.isCancelPending && (
            <Button
              variant="destructive"
              onClick={() => {
                setSaleToCancel(sale.id);
                setCancelDialogOpen(true);
              }}
            >
              Ajukan Batal
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nomor Penjualan</p>
              <p className="font-mono font-semibold">{sale.saleNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pelanggan</p>
              <p className="font-semibold">{sale.customerName || 'Pelanggan Umum'}</p>
            </div>
            {sale.customerPhone && (
              <div>
                <p className="text-sm text-gray-500">Telepon</p>
                <p>{sale.customerPhone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Tanggal Penjualan</p>
              <p>{format(new Date(sale.saleDate), 'dd MMMM yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Metode Pembayaran</p>
              <Badge variant="outline">{formatStatus(sale.paymentMethod)}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Platform</p>
              <Badge variant="secondary">{formatStatus(sale.platform)}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ekspedisi</p>
              {sale.shippingService ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    {sale.shippingService.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">Tidak ada ekspedisi</p>
              )}
            </div>
            {sale.shippingAddress && (
              <div>
                <p className="text-sm text-gray-500">Alamat Pengiriman</p>
                <p className="text-sm whitespace-pre-wrap">{sale.shippingAddress}</p>
              </div>
            )}
            {sale.shippingDocument && (
              <div>
                <p className="text-sm text-gray-500">Dokumen Pengiriman</p>
                <a
                  href={getPdfUrl(sale.shippingDocument)}
                  target="LunaPDFViewer"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-1"
                >
                  <FileText className="h-4 w-4" />
                  Lihat PDF Resi
                </a>
              </div>
            )}
            {user?.role !== 'TCP' && (
                <div>
                  <p className="text-sm text-gray-500">Total Jumlah</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">{getStatusBadge(sale.status, sale.isCancelPending)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Penanggung Jawab</p>
              <p className="font-semibold">{sale.creator?.fullName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dibuat Pada</p>
              <p>{format(new Date(sale.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            {sale.processedAt && (
              <div>
                <p className="text-sm text-gray-500">Diproses Pada</p>
                <p>{format(new Date(sale.processedAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Catatan</p>
              <p className="text-gray-700">{sale.notes || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                {user?.role !== 'TCP' && (
                    <>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                    </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product?.name || '-'}
                    {item.variantName && (
                        <div className="text-sm text-gray-400 font-normal mt-0.5">
                            Varian: {item.variantName}
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  {user?.role !== 'TCP' && (
                      <>
                          <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                      </>
                  )}
                </TableRow>
              ))}
              {user?.role !== 'TCP' && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CancelSaleDialog 
        open={cancelDialogOpen} 
        onOpenChange={setCancelDialogOpen} 
        saleId={saleToCancel} 
      />
    </div>
  );
}
