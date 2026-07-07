'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ClipboardList,
  FolderTree,
  History,
  PackageOpen,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useAdjustDisplayStock,
  useCreateDisplayCategory,
  useCreateDisplayProduct,
  useCreateDisplayRequest,
  useCreateDisplaySupplier,
  useDisplayCategories,
  useDisplayMovements,
  useDisplayProducts,
  useDisplayRequests,
  useDisplaySummary,
  useDisplaySuppliers,
  useReviewDisplayRequest,
} from '@/lib/hooks/useDisplay';
import type { DisplayProduct } from '@/types';

type DisplaySection = 'products' | 'stock' | 'requests' | 'categories' | 'suppliers' | 'movements';

const displayNavigation: Array<{
  key: DisplaySection;
  label: string;
  description: string;
  icon: typeof PackageOpen;
}> = [
  { key: 'products', label: 'Produk Display', description: 'Data barang khusus area display', icon: PackageOpen },
  { key: 'stock', label: 'Stok Display', description: 'Stok terpisah dari penjualan', icon: RefreshCcw },
  { key: 'requests', label: 'Pengajuan Display', description: 'Permintaan perubahan stok display', icon: ClipboardList },
  { key: 'categories', label: 'Kategori Display', description: 'Kategori khusus produk display', icon: FolderTree },
  { key: 'suppliers', label: 'Supplier Display', description: 'Supplier khusus display', icon: Truck },
  { key: 'movements', label: 'Riwayat Stok', description: 'Jejak stok display saja', icon: History },
];

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DISPLAYED: 'Sedang Display',
    STORED: 'Disimpan',
    MAINTENANCE: 'Perawatan',
    DAMAGED: 'Rusak',
    ARCHIVED: 'Arsip',
    NEW: 'Baru',
    GOOD: 'Baik',
    MINOR_DAMAGE: 'Lecet Ringan',
    PENDING: 'Menunggu Review',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    STOCK_IN: 'Tambah Stok',
    STOCK_OUT: 'Kurangi Stok',
    ADJUSTMENT: 'Penyesuaian',
    IN: 'Masuk',
    OUT: 'Keluar',
  };
  return map[status] || status;
}

export default function DisplaySystemPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.isTestingMode;
  const [activeSection, setActiveSection] = useState<DisplaySection>('products');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  const summary = useDisplaySummary();
  const categories = useDisplayCategories();
  const suppliers = useDisplaySuppliers();
  const products = useDisplayProducts({ page: 1, limit: 100, search: search || undefined });
  const requests = useDisplayRequests();
  const movements = useDisplayMovements({ limit: 100 });

  const createCategory = useCreateDisplayCategory();
  const createSupplier = useCreateDisplaySupplier();
  const createProduct = useCreateDisplayProduct();
  const adjustStock = useAdjustDisplayStock();
  const createRequest = useCreateDisplayRequest();
  const reviewRequest = useReviewDisplayRequest();

  const productRows = products.data?.data?.products ?? [];
  const categoryRows = categories.data?.data ?? [];
  const supplierRows = suppliers.data?.data ?? [];
  const requestRows = requests.data?.data ?? [];
  const movementRows = movements.data?.data ?? [];
  const pendingRequestCount = requestRows.filter((request) => request.status === 'PENDING').length;
  const selectedProduct = useMemo(
    () => productRows.find((product) => product.id === selectedProductId) ?? productRows[0],
    [productRows, selectedProductId]
  );

  const [categoryName, setCategoryName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [productForm, setProductForm] = useState({ sku: '', name: '', categoryId: '', supplierId: '', displayLocation: '', stock: '0', minStock: '0' });
  const [stockForm, setStockForm] = useState({ type: 'IN', quantity: '1', targetStock: '0', notes: '' });
  const [requestForm, setRequestForm] = useState({ productId: '', type: 'STOCK_IN', quantity: '1', targetStock: '0', reason: '' });

  const activeNavigation = displayNavigation.find((item) => item.key === activeSection) ?? displayNavigation[0];

  const addProduct = () => {
    createProduct.mutate({
      sku: productForm.sku,
      name: productForm.name,
      categoryId: productForm.categoryId || null,
      supplierId: productForm.supplierId || null,
      displayLocation: productForm.displayLocation || null,
      stock: Number(productForm.stock),
      minStock: Number(productForm.minStock),
      unit: 'pcs',
      condition: 'GOOD',
      status: 'DISPLAYED',
      isActive: true,
    } as Partial<DisplayProduct>, {
      onSuccess: () => setProductForm({ sku: '', name: '', categoryId: '', supplierId: '', displayLocation: '', stock: '0', minStock: '0' }),
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Sistem Display' }]} />

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="flex items-center gap-2 text-3xl font-bold">
                <PackageOpen className="h-8 w-8" /> Sistem Display
              </h1>
              <Badge variant="outline" className="bg-background/80">Area Terpisah</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Modul ini khusus untuk produk display. Data di sini tidak memengaruhi penjualan, stok operasional utama, pelunasan, atau laporan keuangan.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit bg-background/80">
            <Link href="/">Kembali ke Sistem Operasional</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Card><CardHeader><CardTitle>Produk</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.data?.data?.totalProducts ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Stok Rendah</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.data?.data?.lowStockProducts ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pengajuan</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.data?.data?.pendingRequests ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Kategori</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.data?.data?.totalCategories ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Supplier</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.data?.data?.totalSuppliers ?? 0}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5" /> Navigasi Display
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Pilih menu di bawah untuk mengelola area display tanpa masuk ke data operasional utama.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 px-3">
              {displayNavigation.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                const showBadge = item.key === 'requests' && pendingRequestCount > 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-transparent bg-muted/40 text-foreground hover:border-primary/30 hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-primary-foreground' : 'text-primary')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {item.label}
                        {showBadge && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {pendingRequestCount > 99 ? '99+' : pendingRequestCount}
                          </span>
                        )}
                      </span>
                      <span className={cn('mt-0.5 block text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
              <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Catatan:</strong> Sistem Display berdiri sendiri. Perubahan stok display tidak mengubah stok penjualan.
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anda sedang membuka</p>
            <h2 className="mt-1 text-2xl font-bold">{activeNavigation.label}</h2>
            <p className="text-sm text-muted-foreground">{activeNavigation.description}</p>
          </div>

          {activeSection === 'products' && (
            <div className="space-y-4">
              {isAdmin && (
                <Card>
                  <CardHeader><CardTitle>Tambah Produk Display</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Input placeholder="SKU Display" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                    <Input placeholder="Nama produk display" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                    <Select value={productForm.categoryId || 'none'} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa kategori</SelectItem>{categoryRows.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                    <Select value={productForm.supplierId || 'none'} onValueChange={(v) => setProductForm({ ...productForm, supplierId: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa supplier</SelectItem>{supplierRows.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                    <Input placeholder="Lokasi display" value={productForm.displayLocation} onChange={(e) => setProductForm({ ...productForm, displayLocation: e.target.value })} />
                    <Input type="number" placeholder="Stok awal" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                    <Input type="number" placeholder="Minimal stok" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} />
                    <Button onClick={addProduct} disabled={!productForm.sku || !productForm.name || createProduct.isPending}><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle>Daftar Produk Display</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Cari SKU, nama, atau lokasi" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Nama</TableHead><TableHead>Kategori</TableHead><TableHead>Supplier</TableHead><TableHead>Lokasi</TableHead><TableHead>Stok</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{productRows.map((p) => <TableRow key={p.id}><TableCell className="font-mono">{p.sku}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.category?.name || '-'}</TableCell><TableCell>{p.supplier?.name || '-'}</TableCell><TableCell>{p.displayLocation || '-'}</TableCell><TableCell><span className={p.stock <= p.minStock ? 'font-bold text-red-600' : 'font-semibold'}>{p.stock}</span> / min {p.minStock}</TableCell><TableCell><Badge variant="outline">{statusLabel(p.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'stock' && (
            <Card><CardHeader><CardTitle>Penyesuaian Stok Display</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {!isAdmin && <div className="md:col-span-5 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">Role USER tidak bisa mengubah stok langsung. Gunakan menu Pengajuan Display.</div>}
              <Select value={selectedProduct?.id || ''} onValueChange={setSelectedProductId}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{productRows.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}</SelectContent></Select>
              <Select value={stockForm.type} onValueChange={(v) => setStockForm({ ...stockForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IN">Tambah</SelectItem><SelectItem value="OUT">Kurangi</SelectItem><SelectItem value="ADJUSTMENT">Set Stok</SelectItem></SelectContent></Select>
              <Input type="number" placeholder="Jumlah" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} />
              <Input type="number" placeholder="Target stok" value={stockForm.targetStock} onChange={(e) => setStockForm({ ...stockForm, targetStock: e.target.value })} disabled={stockForm.type !== 'ADJUSTMENT'} />
              <Button disabled={!selectedProduct || adjustStock.isPending || !isAdmin} onClick={() => selectedProduct && adjustStock.mutate({ id: selectedProduct.id, data: { type: stockForm.type as any, quantity: Number(stockForm.quantity), targetStock: Number(stockForm.targetStock), notes: stockForm.notes } })}><RefreshCcw className="mr-2 h-4 w-4" /> Simpan Stok</Button>
              <Textarea className="md:col-span-5" placeholder="Catatan penyesuaian" value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} />
            </CardContent></Card>
          )}

          {activeSection === 'requests' && (
            <div className="space-y-4">
              <Card><CardHeader><CardTitle>Buat Pengajuan Stok Display</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Select value={requestForm.productId} onValueChange={(v) => setRequestForm({ ...requestForm, productId: v })}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{productRows.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}</SelectContent></Select>
                <Select value={requestForm.type} onValueChange={(v) => setRequestForm({ ...requestForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="STOCK_IN">Tambah Stok</SelectItem><SelectItem value="STOCK_OUT">Kurangi Stok</SelectItem><SelectItem value="ADJUSTMENT">Set Stok</SelectItem></SelectContent></Select>
                <Input type="number" placeholder="Jumlah" value={requestForm.quantity} onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })} />
                <Input type="number" placeholder="Target stok" value={requestForm.targetStock} onChange={(e) => setRequestForm({ ...requestForm, targetStock: e.target.value })} disabled={requestForm.type !== 'ADJUSTMENT'} />
                <Button disabled={!requestForm.productId || !requestForm.reason || createRequest.isPending} onClick={() => createRequest.mutate({ productId: requestForm.productId, type: requestForm.type as any, quantity: Number(requestForm.quantity), targetStock: Number(requestForm.targetStock), reason: requestForm.reason })}><Send className="mr-2 h-4 w-4" /> Kirim</Button>
                <Textarea className="md:col-span-5" placeholder="Alasan pengajuan" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Daftar Pengajuan</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Tipe</TableHead><TableHead>Jumlah</TableHead><TableHead>Alasan</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead>Aksi</TableHead>}</TableRow></TableHeader><TableBody>{requestRows.map((r) => <TableRow key={r.id}><TableCell>{r.product?.sku} - {r.product?.name}</TableCell><TableCell>{statusLabel(r.type)}</TableCell><TableCell>{r.type === 'ADJUSTMENT' ? r.targetStock : r.quantity}</TableCell><TableCell className="max-w-[280px] whitespace-normal">{r.reason}</TableCell><TableCell><Badge>{statusLabel(r.status)}</Badge></TableCell>{isAdmin && <TableCell className="space-x-2">{r.status === 'PENDING' && <><Button size="sm" onClick={() => reviewRequest.mutate({ id: r.id, action: 'approve' })}><Check className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => reviewRequest.mutate({ id: r.id, action: 'reject', rejectionReason: 'Ditolak admin' })}><X className="h-4 w-4" /></Button></>}</TableCell>}</TableRow>)}</TableBody></Table></CardContent></Card>
            </div>
          )}

          {activeSection === 'categories' && (
            <Card><CardHeader><CardTitle>Kategori Display</CardTitle></CardHeader><CardContent className="space-y-3">{isAdmin && <div className="flex gap-2"><Input placeholder="Nama kategori display" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><Button onClick={() => createCategory.mutate({ name: categoryName } as any, { onSuccess: () => setCategoryName('') })}>Tambah</Button></div>}<Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{categoryRows.map((c) => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.isActive ? 'Aktif' : 'Nonaktif'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          )}

          {activeSection === 'suppliers' && (
            <Card><CardHeader><CardTitle>Supplier Display</CardTitle></CardHeader><CardContent className="space-y-3">{isAdmin && <div className="flex gap-2"><Input placeholder="Nama supplier display" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /><Button onClick={() => createSupplier.mutate({ name: supplierName } as any, { onSuccess: () => setSupplierName('') })}>Tambah</Button></div>}<Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Kontak</TableHead><TableHead>HP</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{supplierRows.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.contact || '-'}</TableCell><TableCell>{s.phone || '-'}</TableCell><TableCell>{s.isActive ? 'Aktif' : 'Nonaktif'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          )}

          {activeSection === 'movements' && (
            <Card><CardHeader><CardTitle>Riwayat Stok Display</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Produk</TableHead><TableHead>Tipe</TableHead><TableHead>Qty</TableHead><TableHead>Sebelum</TableHead><TableHead>Sesudah</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader><TableBody>{movementRows.map((m) => <TableRow key={m.id}><TableCell>{new Date(m.createdAt).toLocaleString('id-ID')}</TableCell><TableCell>{m.product?.sku} - {m.product?.name}</TableCell><TableCell>{statusLabel(m.type)}</TableCell><TableCell>{m.quantity}</TableCell><TableCell>{m.stockBefore}</TableCell><TableCell>{m.stockAfter}</TableCell><TableCell className="max-w-[260px] whitespace-normal">{m.notes || '-'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          )}
        </main>
      </div>
    </div>
  );
}
