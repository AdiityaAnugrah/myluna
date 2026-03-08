'use client';

import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { 
  Pencil, 
  ArrowLeft, 
  Package, 
  Tag, 
  Layers, 
  Ruler, 
  Weight, 
  Image as ImageIcon,
  History,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';
import { formatStatus } from '@/lib/utils/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStockMovements } from '@/lib/hooks/useStock';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getImageUrl } from '@/lib/utils/url';
import { getVariants } from '@/lib/utils/sales';

interface ProductDetailProps {
  product: Product;
  onEdit: () => void;
}

export function ProductDetail({ product, onEdit }: ProductDetailProps) {
  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const isLowStock = product.stock <= product.minStock;

  const { data: movementsData } = useStockMovements({ productId: product.id, limit: 10 });
  const movements = movementsData?.data?.movements || [];
  
  // Parse variants safely - can be array, JSON string, or null
  const productVariants = product.variants ? (Array.isArray(product.variants) ? product.variants : []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <Badge variant={product.isActive ? 'default' : 'secondary'}>
            {formatStatus(product.isActive ? 'ACTIVE' : 'PASSIVE')}
          </Badge>
        </div>
        <Button onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Produk
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="info">
            <Package className="mr-2 h-4 w-4" />
            Informasi Produk
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Riwayat Stok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Informasi Produk
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SKU</label>
                      <p className="text-lg font-semibold">{product.sku}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Kategori</label>
                      <p className="text-lg">
                        {product.category?.parent && (
                          <span className="text-muted-foreground/60">{product.category.parent.name} &gt; </span>
                        )}
                        {product.category?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Satuan</label>
                      <p>{product.unit}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                      <p className="whitespace-pre-wrap mt-1">{product.description || 'Tidak ada deskripsi'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Varian Produk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productVariants.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground italic">Produk ini tidak memiliki varian.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Varian</TableHead>
                          <TableHead>Nilai</TableHead>
                          <TableHead className="text-right">Penyesuaian Harga</TableHead>
                          <TableHead className="text-right">Stok</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productVariants.map((v, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell>{v.value}</TableCell>
                            <TableCell className="text-right font-mono text-blue-600">
                              {parseFloat(v.priceAdjustment) > 0 ? '+' : ''}{formatCurrency(v.priceAdjustment)}
                            </TableCell>
                            <TableCell className="text-right">{v.stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden border mb-4">
                    {product.imageUrl ? (
                      <ImageWithFallback
                        src={getImageUrl(product.imageUrl)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        lazy={false}
                      />
                    ) : (
                      <ImageIcon className="h-20 w-20 text-muted-foreground/20" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Gambar Produk</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Harga & Stok
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Harga Beli</span>
                    <span className="font-semibold">{formatCurrency(product.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Harga Jual</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stok Saat Ini</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${isLowStock ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {product.stock}
                      </span>
                      {isLowStock && <Badge variant="destructive">Rendah</Badge>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground/60">
                    <span>Min. Stok</span>
                    <span>{product.minStock}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-primary" />
                    Dimensi & Berat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Panjang</label>
                      <p className="font-mono">{product.length ? `${product.length} cm` : '-'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Lebar</label>
                      <p className="font-mono">{product.width ? `${product.width} cm` : '-'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Tinggi</label>
                      <p className="font-mono">{product.height ? `${product.height} cm` : '-'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Berat</label>
                      <div className="flex items-center gap-1 font-mono">
                        <Weight className="h-3 w-3 text-gray-400" />
                        {product.weight ? `${product.weight} kg` : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Riwayat Pergerakan Stok
              </CardTitle>
              <CardDescription>Menampilkan 10 pergerakan stok terakhir untuk produk ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCcw className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Tidak ada riwayat pergerakan stok ditemukan.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Oleh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-mono">
                          {format(new Date(m.createdAt), 'dd MMM yyyy HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {m.type === 'IN' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {m.type === 'OUT' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {m.type === 'ADJUSTMENT' && <RefreshCcw className="h-4 w-4 text-blue-500" />}
                            <span className="text-xs font-medium">{m.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${
                          m.quantity > 0 ? 'text-green-600' : m.quantity < 0 ? 'text-red-600' : ''
                        }`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={m.reference}>
                          {m.reference || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={m.notes}>
                          {m.notes || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.creator?.fullName || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
