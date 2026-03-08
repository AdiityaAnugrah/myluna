'use client';

import { usePurchase } from '@/lib/hooks/usePurchases';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { use } from 'react';
import { formatCurrency } from '@/lib/utils/sales';

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = usePurchase(id);

  const purchase = data?.data;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      PENDING: 'secondary',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pembelian tidak ditemukan</p>
        <Link href="/purchases">
          <Button className="mt-4">Kembali ke Pembelian</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Pembelian', href: '/purchases' },
          { label: purchase.purchaseNumber },
        ]}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detail Pesanan Pembelian</h1>
            <p className="text-gray-600 mt-1">{purchase.purchaseNumber}</p>
          </div>
        </div>
        {getStatusBadge(purchase.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nomor Pembelian</p>
              <p className="font-mono font-semibold">{purchase.purchaseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pemasok</p>
              <p className="font-semibold">{purchase.supplier?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tanggal Pembelian</p>
              <p>{format(new Date(purchase.purchaseDate), 'dd MMMM yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Jumlah</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(purchase.totalAmount)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">{getStatusBadge(purchase.status)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dibuat Pada</p>
              <p>{format(new Date(purchase.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Catatan</p>
              <p className="text-gray-700">{purchase.notes || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Barang</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Varian</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product?.name || '-'}</TableCell>
                  <TableCell>
                    {item.variantName ? (
                      <Badge variant="secondary" className="font-normal">{item.variantName}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold text-blue-600">
                  {formatCurrency(purchase.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
