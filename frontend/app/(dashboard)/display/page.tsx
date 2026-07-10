'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Filter,
  FolderTree,
  History,
  Loader2,
  PackageOpen,
  Plus,
  RefreshCcw,
  Search,
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
import type { DisplayProduct, DisplayProductStatus, DisplayRequestStatus } from '@/types';

type DisplayTab = 'products' | 'requests' | 'movements' | 'master';

const STATUS_OPTIONS: Array<{ value: 'all' | DisplayProductStatus; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'DISPLAYED', label: 'Sedang Display' },
  { value: 'STORED', label: 'Disimpan' },
  { value: 'MAINTENANCE', label: 'Perawatan' },
  { value: 'DAMAGED', label: 'Rusak' },
  { value: 'ARCHIVED', label: 'Arsip' },
];

const REQUEST_STATUS_OPTIONS: Array<{ value: 'all' | DisplayRequestStatus; label: string }> = [
  { value: 'all', label: 'Semua Pengajuan' },
  { value: 'PENDING', label: 'Menunggu Review' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
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
    ADJUSTMENT: 'Set Stok',
    IN: 'Masuk',
    OUT: 'Keluar',
  };
  return map[status] || status;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DISPLAYED: 'bg-blue-100 text-blue-800 border-blue-200',
    STORED: 'bg-slate-100 text-slate-700 border-slate-200',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    DAMAGED: 'bg-red-100 text-red-800 border-red-200',
    ARCHIVED: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    IN: 'bg-green-100 text-green-800 border-green-200',
    OUT: 'bg-red-100 text-red-800 border-red-200',
    ADJUSTMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return <Badge variant="outline" className={cn('whitespace-nowrap text-xs', map[status])}>{statusLabel(status)}</Badge>;
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DisplaySystemPage() {
  const { user } = useAuth();
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<DisplayTab>('products');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const summary = useDisplaySummary();
  const categories = useDisplayCategories();
  const suppliers = useDisplaySuppliers();
  const products = useDisplayProducts({
    page: 1,
    limit: 100,
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    status: statusFilter || undefined,
  });
  const requests = useDisplayRequests({ status: requestStatusFilter || undefined });
  const movements = useDisplayMovements({ productId: selectedProductId || undefined, limit: 100 });

  const createCategory = useCreateDisplayCategory();
  const createSupplier = useCreateDisplaySupplier();
  const createProduct = useCreateDisplayProduct();
  const adjustStock = useAdjustDisplayStock();
  const createRequest = useCreateDisplayRequest();
  const reviewRequest = useReviewDisplayRequest();

  const productRows = products.data?.data?.products ?? [];
  const pagination = products.data?.data?.pagination;
  const categoryRows = categories.data?.data ?? [];
  const supplierRows = suppliers.data?.data ?? [];
  const requestRows = requests.data?.data ?? [];
  const movementRows = movements.data?.data ?? [];
  const pendingRequestCount = requestRows.filter((request) => request.status === 'PENDING').length;
  const lowStockRows = productRows.filter((product) => product.stock <= product.minStock);

  const selectedProduct = useMemo(
    () => productRows.find((product) => product.id === selectedProductId) ?? productRows[0],
    [productRows, selectedProductId]
  );

  const [categoryName, setCategoryName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    supplierId: '',
    displayLocation: '',
    stock: '0',
    minStock: '0',
  });
  const [stockForm, setStockForm] = useState({ type: 'IN', quantity: '1', targetStock: '0', notes: '' });
  const [requestForm, setRequestForm] = useState({ productId: '', type: 'STOCK_IN', quantity: '1', targetStock: '0', reason: '' });

  const hasActiveFilter = !!(search || categoryFilter || statusFilter || requestStatusFilter || selectedProductId);

  const applySearch = () => setSearch(searchInput.trim());
  const resetFilters = () => {
    setSearch('');
    setSearchInput('');
    setCategoryFilter('');
    setStatusFilter('');
    setRequestStatusFilter('');
    setSelectedProductId('');
  };

  const addProduct = () => {
    createProduct.mutate({
      sku: productForm.sku.trim() || undefined,
      name: productForm.name.trim(),
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
      onSuccess: () => {
        setProductForm({ sku: '', name: '', categoryId: '', supplierId: '', displayLocation: '', stock: '0', minStock: '0' });
        setShowCreateProduct(false);
      },
    });
  };

  const submitStockAdjustment = () => {
    if (!selectedProduct) return;
    adjustStock.mutate({
      id: selectedProduct.id,
      data: {
        type: stockForm.type as 'IN' | 'OUT' | 'ADJUSTMENT',
        quantity: Number(stockForm.quantity),
        targetStock: Number(stockForm.targetStock),
        notes: stockForm.notes,
      },
    }, {
      onSuccess: () => setShowStockForm(false),
    });
  };

  const submitRequest = () => {
    createRequest.mutate({
      productId: requestForm.productId,
      type: requestForm.type as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT',
      quantity: Number(requestForm.quantity),
      targetStock: Number(requestForm.targetStock),
      reason: requestForm.reason,
    }, {
      onSuccess: () => {
        setRequestForm({ productId: '', type: 'STOCK_IN', quantity: '1', targetStock: '0', reason: '' });
        setShowRequestForm(false);
        setActiveTab('requests');
      },
    });
  };

  const tabs: Array<{ key: DisplayTab; label: string; icon: typeof PackageOpen; count?: number }> = [
    { key: 'products', label: 'Produk Display', icon: PackageOpen, count: pagination?.total ?? productRows.length },
    { key: 'requests', label: 'Pengajuan Display', icon: ClipboardList, count: pendingRequestCount },
    { key: 'movements', label: 'Riwayat Stok', icon: History, count: movementRows.length },
    { key: 'master', label: 'Master Display', icon: FolderTree },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Sistem Display' }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Sistem Display</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Terpisah dari Penjualan</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Kelola barang khusus display. Stok di halaman ini tidak masuk stok operasional, transaksi penjualan, pelunasan, atau laporan keuangan.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => { setShowRequestForm(true); setActiveTab('requests'); }}>
            <Send className="mr-2 h-4 w-4" /> Buat Pengajuan
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateProduct(true)}>
              <Plus className="mr-2 h-4 w-4" /> Produk Display Baru
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 animate-in [animation-delay:50ms]">
        <StatCard icon={PackageOpen} label="Produk Display" value={summary.data?.data?.totalProducts ?? 0} tone="blue" />
        <StatCard icon={AlertTriangle} label="Stok Rendah" value={summary.data?.data?.lowStockProducts ?? 0} tone="red" />
        <StatCard icon={ClipboardList} label="Menunggu Review" value={summary.data?.data?.pendingRequests ?? 0} tone="yellow" />
        <StatCard icon={FolderTree} label="Kategori" value={summary.data?.data?.totalCategories ?? 0} tone="primary" />
        <StatCard icon={Truck} label="Supplier" value={summary.data?.data?.totalSuppliers ?? 0} tone="green" />
      </div>

      <div className="rounded-xl border bg-card p-3 shadow-sm animate-in [animation-delay:75ms]">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-transparent bg-muted/30 hover:bg-muted'
                )}
              >
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px]', active ? 'bg-primary-foreground/20' : 'bg-background border')}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Pembeda utama: Display bukan Penjualan.</p>
            <p className="mt-1 text-xs leading-5">Produk display hanya untuk pajangan/contoh unit. Perubahan stok display hanya tercatat di Riwayat Stok Display dan tidak memengaruhi stok produk utama maupun laporan keuangan.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3 animate-in [animation-delay:100ms]">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="h-4 w-4" /> FILTER DISPLAY
          {hasActiveFilter && (
            <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-xs font-normal text-red-500 hover:text-red-700">
              <X className="h-3 w-3" /> Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari SKU, nama, lokasi..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applySearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={applySearch} className="shrink-0"><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categoryRows.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={requestStatusFilter || 'all'} onValueChange={(value) => setRequestStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="Status Pengajuan" /></SelectTrigger>
            <SelectContent>{REQUEST_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {activeTab === 'movements' && (
          <Select value={selectedProductId || 'all'} onValueChange={(value) => setSelectedProductId(value === 'all' ? '' : value)}>
            <SelectTrigger className="md:max-w-md"><SelectValue placeholder="Filter riwayat berdasarkan produk display" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Produk Display</SelectItem>
              {productRows.map((product) => <SelectItem key={product.id} value={product.id}>{product.sku} - {product.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {showCreateProduct && isAdmin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Produk Display Baru</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input placeholder="SKU otomatis oleh sistem" value={productForm.sku} disabled />
            <Input placeholder="Nama produk display" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <Select value={productForm.categoryId || 'none'} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Tanpa kategori</SelectItem>{categoryRows.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={productForm.supplierId || 'none'} onValueChange={(v) => setProductForm({ ...productForm, supplierId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Tanpa supplier</SelectItem>{supplierRows.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Lokasi display" value={productForm.displayLocation} onChange={(e) => setProductForm({ ...productForm, displayLocation: e.target.value })} />
            <Input type="number" min="0" placeholder="Stok awal" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
            <Input type="number" min="0" placeholder="Minimal stok" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} />
            <div className="flex gap-2"><Button onClick={addProduct} disabled={!productForm.name || createProduct.isPending}>{createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button><Button variant="outline" onClick={() => setShowCreateProduct(false)}>Batal</Button></div>
            <p className="text-xs text-muted-foreground md:col-span-4">SKU Display akan dibuat otomatis dengan format seperti DSP-00001 saat produk disimpan.</p>
          </CardContent>
        </Card>
      )}

      {showRequestForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Buat Pengajuan Stok Display</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select value={requestForm.productId} onValueChange={(v) => setRequestForm({ ...requestForm, productId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih produk display" /></SelectTrigger>
              <SelectContent>{productRows.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={requestForm.type} onValueChange={(v) => setRequestForm({ ...requestForm, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="STOCK_IN">Tambah Stok</SelectItem><SelectItem value="STOCK_OUT">Kurangi Stok</SelectItem><SelectItem value="ADJUSTMENT">Set Stok</SelectItem></SelectContent>
            </Select>
            <Input type="number" min="1" placeholder="Jumlah" value={requestForm.quantity} onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })} />
            <Input type="number" min="0" placeholder="Target stok" value={requestForm.targetStock} onChange={(e) => setRequestForm({ ...requestForm, targetStock: e.target.value })} disabled={requestForm.type !== 'ADJUSTMENT'} />
            <div className="flex gap-2"><Button disabled={!requestForm.productId || !requestForm.reason || createRequest.isPending} onClick={submitRequest}>{createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim</Button><Button variant="outline" onClick={() => setShowRequestForm(false)}>Batal</Button></div>
            <Textarea className="md:col-span-5" placeholder="Alasan pengajuan" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
          </CardContent>
        </Card>
      )}

      {showStockForm && isAdmin && selectedProduct && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCcw className="h-5 w-5" /> Penyesuaian Stok Display</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select value={selectedProduct?.id || ''} onValueChange={setSelectedProductId}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent>{productRows.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={stockForm.type} onValueChange={(v) => setStockForm({ ...stockForm, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="IN">Tambah</SelectItem><SelectItem value="OUT">Kurangi</SelectItem><SelectItem value="ADJUSTMENT">Set Stok</SelectItem></SelectContent>
            </Select>
            <Input type="number" min="1" placeholder="Jumlah" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} />
            <Input type="number" min="0" placeholder="Target stok" value={stockForm.targetStock} onChange={(e) => setStockForm({ ...stockForm, targetStock: e.target.value })} disabled={stockForm.type !== 'ADJUSTMENT'} />
            <div className="flex gap-2"><Button disabled={adjustStock.isPending} onClick={submitStockAdjustment}>{adjustStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button><Button variant="outline" onClick={() => setShowStockForm(false)}>Batal</Button></div>
            <Textarea className="md:col-span-5" placeholder="Catatan penyesuaian" value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'products' && (
        <>
          <div className="md:hidden space-y-3">
            {products.isLoading ? <LoadingState /> : productRows.length === 0 ? <EmptyState label="Tidak ada produk display ditemukan" /> : productRows.map((product) => (
              <div key={product.id} className="rounded-lg border bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div><div className="font-mono text-xs font-bold">{product.sku}</div><div className="font-semibold">{product.name}</div></div>
                  {statusBadge(product.status)}
                </div>
                <div className="space-y-1 text-xs">
                  <InfoRow label="Lokasi" value={product.displayLocation || '-'} />
                  <InfoRow label="Kategori" value={product.category?.name || '-'} />
                  <InfoRow label="Supplier" value={product.supplier?.name || '-'} />
                  <InfoRow label="Stok Display" value={`${product.stock} / min ${product.minStock}`} danger={product.stock <= product.minStock} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => { setRequestForm({ ...requestForm, productId: product.id }); setShowRequestForm(true); }}>Ajukan Stok</Button>
                  {isAdmin && <Button size="sm" onClick={() => { setSelectedProductId(product.id); setShowStockForm(true); }}>Adjust Stok</Button>}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden rounded-xl border bg-card shadow-sm tour-display-list">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>SKU Display</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Stok Display</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.isLoading ? (
                  <TableRow><TableCell colSpan={9} className="py-16 text-center"><LoadingInline /></TableCell></TableRow>
                ) : productRows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="py-16 text-center"><EmptyInline label="Tidak ada produk display ditemukan" /></TableCell></TableRow>
                ) : productRows.map((product, index) => (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-medium">{product.sku}</TableCell>
                    <TableCell className="font-medium text-sm">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{product.category?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{product.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{product.displayLocation || '-'}</TableCell>
                    <TableCell className={cn('text-right text-sm font-bold', product.stock <= product.minStock && 'text-red-600')}>{product.stock}<span className="ml-1 text-xs font-normal text-muted-foreground">/ min {product.minStock}</span></TableCell>
                    <TableCell>{statusBadge(product.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => { setRequestForm({ ...requestForm, productId: product.id }); setShowRequestForm(true); }}>Ajukan Stok</Button>
                        {isAdmin && <Button size="sm" className="h-8 px-2 text-xs" onClick={() => { setSelectedProductId(product.id); setShowStockForm(true); }}>Adjust</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>Tanggal</TableHead><TableHead>Produk Display</TableHead><TableHead>Tipe</TableHead><TableHead>Jumlah</TableHead><TableHead>Pengaju</TableHead><TableHead>Alasan</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead className="text-right">Aksi</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {requests.isLoading ? <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="py-16 text-center"><LoadingInline /></TableCell></TableRow> : requestRows.length === 0 ? <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="py-16 text-center"><EmptyInline label="Tidak ada pengajuan display" /></TableCell></TableRow> : requestRows.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{shortDate(request.createdAt)}</TableCell>
                  <TableCell><div className="font-mono text-xs">{request.product?.sku}</div><div className="text-sm font-medium">{request.product?.name}</div></TableCell>
                  <TableCell>{statusBadge(request.type)}</TableCell>
                  <TableCell className="font-semibold">{request.type === 'ADJUSTMENT' ? request.targetStock : request.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{request.requester?.fullName || '-'}</TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-sm">{request.reason}</TableCell>
                  <TableCell>{statusBadge(request.status)}</TableCell>
                  {isAdmin && <TableCell className="text-right">{request.status === 'PENDING' && <div className="flex justify-end gap-1"><Button size="sm" className="h-8 px-2" onClick={() => reviewRequest.mutate({ id: request.id, action: 'approve' })}><Check className="h-4 w-4" /></Button><Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => reviewRequest.mutate({ id: request.id, action: 'reject', rejectionReason: 'Ditolak admin' })}><X className="h-4 w-4" /></Button></div>}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>Tanggal</TableHead><TableHead>Produk Display</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Sebelum</TableHead><TableHead className="text-right">Sesudah</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
            <TableBody>
              {movements.isLoading ? <TableRow><TableCell colSpan={7} className="py-16 text-center"><LoadingInline /></TableCell></TableRow> : movementRows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-16 text-center"><EmptyInline label="Belum ada riwayat stok display" /></TableCell></TableRow> : movementRows.map((movement) => (
                <TableRow key={movement.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{shortDate(movement.createdAt)}</TableCell>
                  <TableCell><div className="font-mono text-xs">{movement.product?.sku}</div><div className="text-sm font-medium">{movement.product?.name}</div></TableCell>
                  <TableCell>{statusBadge(movement.type)}</TableCell>
                  <TableCell className="text-right font-semibold">{movement.quantity}</TableCell>
                  <TableCell className="text-right">{movement.stockBefore}</TableCell>
                  <TableCell className="text-right font-semibold">{movement.stockAfter}</TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">{movement.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Kategori Display</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && <div className="flex gap-2"><Input placeholder="Nama kategori display" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><Button disabled={!categoryName || createCategory.isPending} onClick={() => createCategory.mutate({ name: categoryName } as any, { onSuccess: () => setCategoryName('') })}>Tambah</Button></div>}
              <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{categoryRows.map((category) => <TableRow key={category.id}><TableCell>{category.name}</TableCell><TableCell>{category.isActive ? statusBadge('APPROVED') : statusBadge('ARCHIVED')}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Supplier Display</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && <div className="flex gap-2"><Input placeholder="Nama supplier display" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /><Button disabled={!supplierName || createSupplier.isPending} onClick={() => createSupplier.mutate({ name: supplierName } as any, { onSuccess: () => setSupplierName('') })}>Tambah</Button></div>}
              <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Kontak</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{supplierRows.map((supplier) => <TableRow key={supplier.id}><TableCell>{supplier.name}</TableCell><TableCell>{supplier.contact || supplier.phone || '-'}</TableCell><TableCell>{supplier.isActive ? statusBadge('APPROVED') : statusBadge('ARCHIVED')}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent>
          </Card>
        </div>
      )}

      {lowStockRows.length > 0 && activeTab === 'products' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
          <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Ada {lowStockRows.length} produk display di bawah minimal stok.</p><p className="mt-1 text-xs">Gunakan tombol Ajukan Stok untuk user, atau Adjust Stok untuk admin/super admin.</p></div></div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof PackageOpen; label: string; value: number; tone: 'blue' | 'red' | 'yellow' | 'primary' | 'green' }) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className={cn('rounded-lg p-2', toneMap[tone])}><Icon className="h-4 w-4" /></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className={cn('text-xl font-black', toneMap[tone].split(' ').at(-1))}>{value}</p></div>
    </div>
  );
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className={cn('text-right font-medium', danger && 'text-red-600')}>{value}</span></div>;
}

function LoadingState() {
  return <div className="py-8 text-center space-y-3"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Memuat data...</p></div>;
}

function LoadingInline() {
  return <div className="flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Memuat data...</p></div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-xl border-2 border-dashed bg-muted/30 py-12 text-center"><PackageOpen className="mx-auto mb-2 h-10 w-10 opacity-30" /><p className="text-sm text-muted-foreground">{label}</p></div>;
}

function EmptyInline({ label }: { label: string }) {
  return <div className="flex flex-col items-center gap-2 opacity-40"><PackageOpen className="h-12 w-12" /><p className="text-sm">{label}</p></div>;
}
