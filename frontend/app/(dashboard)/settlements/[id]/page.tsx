'use client';

import { useSettlement } from '@/lib/hooks/useSettlements';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Loader2, FileText, Calendar, User, DollarSign,
  Receipt, StickyNote, ImageIcon, ShoppingBag, Phone,
  CheckCircle2, Package, CreditCard, Store, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { use } from 'react';
import { formatStatus } from '@/lib/utils/format';
import { PreviewableImage } from '@/components/ui/previewable-image';


function saleItemName(item: any) {
  return item?.itemType === 'COMPONENT' ? item.componentName || 'Komponen' : item?.product?.name || '-';
}

export default function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSettlement(id);
  const { user } = useAuthStore();

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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat detail pelunasan...</p>
        </div>
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
  const potongan = sale
    ? parseFloat(String(sale.totalAmount)) - parseFloat(String(settlement.netAmount))
    : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Keuangan' },
          { label: 'Pelunasan', href: '/settlements' },
          { label: settlement.invoiceNumber || sale?.saleNumber || 'Detail' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settlements">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Detail Pelunasan</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {settlement.invoiceNumber || sale?.saleNumber || '-'}
            </p>
          </div>
        </div>
        <Badge className="bg-green-600 text-white gap-1.5 px-3 py-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Lunas
        </Badge>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in-0">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Kotor</p>
            <p className="text-sm font-black">{sale ? formatCurrency(sale.totalAmount) : '-'}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dana Bersih</p>
            <p className="text-sm font-black text-green-600">{formatCurrency(settlement.netAmount)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg"><Receipt className="h-4 w-4 text-orange-600" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Potongan</p>
            <p className="text-sm font-black text-orange-600">{formatCurrency(potongan)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Item</p>
            <p className="text-sm font-black text-blue-600">{sale?.items?.length ?? '-'} item</p>
          </div>
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settlement Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" />
              Informasi Pelunasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settlement.invoiceNumber && (
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> No. Invoice
                </p>
                <p className="font-mono font-semibold text-sm">{settlement.invoiceNumber}</p>
              </div>
            )}
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Dana Bersih (Net)
              </p>
              <p className="font-bold text-green-600">{formatCurrency(settlement.netAmount)}</p>
            </div>
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Tanggal Pelunasan
              </p>
              <p className="font-medium text-sm">{format(new Date(settlement.settlementDate), 'dd MMMM yyyy')}</p>
            </div>
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Disetor oleh
              </p>
              <p className="font-medium text-sm">{settlement.creator?.fullName || '-'}</p>
            </div>
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Dibuat pada
              </p>
              <p className="text-sm">{format(new Date(settlement.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            {settlement.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                  <StickyNote className="h-3.5 w-3.5" /> Catatan
                </p>
                <p className="text-sm text-foreground bg-muted/30 rounded-lg p-2.5">{settlement.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Informasi Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale ? (
              <>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">No. Penjualan</p>
                  <Link href={`/sales/${sale.id}`} className="font-mono font-semibold text-sm text-primary hover:underline">
                    {sale.saleNumber}
                  </Link>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Pelanggan</p>
                  <p className="font-semibold text-sm">{sale.customerName || 'Pelanggan Umum'}</p>
                </div>
                {sale.customerPhone && (
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Telepon
                    </p>
                    <p className="text-sm">{sale.customerPhone}</p>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Tanggal Jual
                  </p>
                  <p className="text-sm">{format(new Date(sale.saleDate), 'dd MMMM yyyy')}</p>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Platform
                  </p>
                  <Badge variant="secondary" className="text-xs">{formatStatus(sale.platform)}</Badge>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Pembayaran
                  </p>
                  <Badge variant="outline" className="text-xs">{formatStatus(sale.paymentMethod)}</Badge>
                </div>
                {sale.creator && (
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" /> Penanggung Jawab
                    </p>
                    <p className="text-sm font-medium">{sale.creator.fullName}</p>
                  </div>
                )}
                {user?.role !== 'TCP' && (
                  <div className="flex items-start justify-between pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Total (Kotor)</p>
                    <p className="font-bold">{formatCurrency(sale.totalAmount)}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Data penjualan tidak tersedia</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      {sale?.items && sale.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Item Produk
              <Badge variant="secondary" className="ml-auto">{sale.items.length} item</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  {user?.role !== 'TCP' && (
                    <>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Diskon</TableHead>
                      <TableHead className="text-right pr-6">Subtotal</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{saleItemName(item)}</p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground mt-0.5">Varian: {item.variantName}</p>
                        )}
                        {item.product?.sku && (
                          <p className="text-xs text-muted-foreground font-mono">SKU: {item.product.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.quantity} {item.product?.unit || 'pcs'}
                    </TableCell>
                    {user?.role !== 'TCP' && (
                      <>
                        <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right text-sm text-orange-600">
                          {parseFloat(item.discount || 0) > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold pr-6">{formatCurrency(item.subtotal)}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {user?.role !== 'TCP' && (
                  <TableRow className="bg-muted/20 font-bold">
                    <TableCell colSpan={user?.role !== 'TCP' ? 5 : 2} className="pl-6 text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right pr-6 text-base">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      {sale && user?.role !== 'TCP' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Keuangan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-5 bg-muted/30 rounded-xl border">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Total Kotor</p>
                <p className="text-2xl font-black">{formatCurrency(sale.totalAmount)}</p>
              </div>
              <div className="text-center p-5 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2">Dana Bersih</p>
                <p className="text-2xl font-black text-green-600">{formatCurrency(settlement.netAmount)}</p>
              </div>
              <div className="text-center p-5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-2">Potongan / Biaya</p>
                <p className="text-2xl font-black text-orange-600">{formatCurrency(potongan)}</p>
                {sale.totalAmount > 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    {((potongan / parseFloat(String(sale.totalAmount))) * 100).toFixed(1)}% dari total
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proof Document */}
      {settlement.proofDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-primary" />
              Bukti Pelunasan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewableImage
              src={getProofDocumentUrl(settlement.proofDocument)}
              alt="Bukti pelunasan"
              className="max-h-96 w-full max-w-lg"
              imageClassName="object-contain"
            />
            <p className="text-xs text-muted-foreground mt-2">{settlement.proofDocument}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
