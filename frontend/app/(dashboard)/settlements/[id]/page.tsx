'use client';

import { useSettlement } from '@/lib/hooks/useSettlements';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, FileText, Calendar, User, DollarSign, Receipt, StickyNote, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { use } from 'react';

export default function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSettlement(id);

  const settlement = (data as any)?.data;

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const getProofDocumentUrl = (filename: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '');
    return `${baseUrl}/uploads/proofs/${filename}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pelunasan tidak ditemukan</p>
        <Link href="/settlements">
          <Button className="mt-4">Kembali ke Pelunasan</Button>
        </Link>
      </div>
    );
  }

  const sale = settlement.sale;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Keuangan' },
          { label: 'Pelunasan', href: '/settlements' },
          { label: `Detail` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settlements">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detail Pelunasan</h1>
            <p className="text-gray-600 mt-1">
              {settlement.invoiceNumber || sale?.saleNumber || '-'}
            </p>
          </div>
        </div>
        <Badge variant="default" className="bg-green-600 text-white">
          Lunas
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settlement Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Informasi Pelunasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settlement.invoiceNumber && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  No. Invoice
                </p>
                <p className="font-mono font-semibold mt-0.5">{settlement.invoiceNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Dana Bersih (Net)
              </p>
              <p className="text-2xl font-bold text-green-600 mt-0.5">
                {formatCurrency(settlement.netAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tanggal Pelunasan
              </p>
              <p className="font-medium mt-0.5">
                {format(new Date(settlement.settlementDate), 'dd MMMM yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Dibuat oleh
              </p>
              <p className="font-medium mt-0.5">
                {settlement.creator?.fullName || '-'}
              </p>
            </div>
            {settlement.notes && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Catatan
                </p>
                <p className="text-gray-700 mt-0.5">{settlement.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Dibuat pada</p>
              <p className="text-sm mt-0.5">
                {format(new Date(settlement.createdAt), 'dd MMM yyyy HH:mm')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sale Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informasi Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">No. Penjualan</p>
                  <p className="font-mono font-semibold mt-0.5">{sale.saleNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pelanggan</p>
                  <p className="font-semibold mt-0.5">{sale.customerName || 'Pelanggan Umum'}</p>
                </div>
                {sale.customerPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telepon</p>
                    <p className="mt-0.5">{sale.customerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Penjualan</p>
                  <p className="mt-0.5">
                    {format(new Date(sale.saleDate), 'dd MMMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total (Kotor)</p>
                  <p className="text-xl font-bold mt-0.5">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </div>
                {sale.creator && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dibuat oleh</p>
                    <p className="mt-0.5">{sale.creator.fullName}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Data penjualan tidak tersedia</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Card */}
      {sale && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Keuangan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Kotor</p>
                <p className="text-xl font-bold">{formatCurrency(sale.totalAmount)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-muted-foreground mb-1">Dana Bersih</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(settlement.netAmount)}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-muted-foreground mb-1">Potongan / Biaya</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(
                    parseFloat(String(sale.totalAmount)) - parseFloat(String(settlement.netAmount))
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proof Document */}
      {settlement.proofDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Bukti Pelunasan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden max-w-lg">
              <img
                src={getProofDocumentUrl(settlement.proofDocument)}
                alt="Bukti pelunasan"
                className="w-full h-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<p class="p-4 text-sm text-muted-foreground">Gambar tidak dapat dimuat</p>';
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{settlement.proofDocument}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
