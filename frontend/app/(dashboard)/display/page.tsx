
'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, History, Loader2, PackageOpen, Printer, RefreshCcw, Search, Send, Truck, XCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { getImageUrl } from '@/lib/utils/url';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateDisplayProduct, useCreateDisplayRequest, useCreateDisplayReturn, useDisplayMovements, useDisplayProducts, useDisplayRequests, useDisplayReturns, useDisplaySummary, useReviewDisplayRequest, useUpdateDisplayReturnStatus } from '@/lib/hooks/useDisplay';
import type { DisplayProduct, DisplayRequestStatus, DisplayReturn, DisplayReturnStatus } from '@/types';

type DisplayTab = 'products' | 'requests' | 'returns' | 'letter' | 'history';

const requestStatusOptions: Array<{ value: 'all' | DisplayRequestStatus; label: string }> = [
  { value: 'all', label: 'Semua Pengajuan' },
  { value: 'PENDING', label: 'Menunggu Review' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
];

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DISPLAYED: 'Sedang Display', STORED: 'Slot Kosong', MAINTENANCE: 'Dalam Retur/Perawatan', DAMAGED: 'Rusak', ARCHIVED: 'Arsip', GOOD: 'Baik', MINOR_DAMAGE: 'Lecet Ringan',
    PENDING: 'Menunggu Review', APPROVED: 'Disetujui', REJECTED: 'Ditolak', STOCK_IN: 'Pakai Slot Display', STOCK_OUT: 'Kosongkan Slot Display', ADJUSTMENT: 'Atur Slot Display', IN: 'Masuk Display', OUT: 'Keluar Display',
    READY_TO_SEND: 'Siap Dikirim', SENT: 'Dikirim', RECEIVED: 'Diterima', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan', DRAFT: 'Draft',
  };
  return map[status] || status;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DISPLAYED: 'bg-green-100 text-green-800 border-green-200', STORED: 'bg-slate-100 text-slate-700 border-slate-200', MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200', DAMAGED: 'bg-red-100 text-red-800 border-red-200',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200', APPROVED: 'bg-green-100 text-green-800 border-green-200', REJECTED: 'bg-red-100 text-red-800 border-red-200', READY_TO_SEND: 'bg-blue-100 text-blue-800 border-blue-200', SENT: 'bg-indigo-100 text-indigo-800 border-indigo-200', RECEIVED: 'bg-purple-100 text-purple-800 border-purple-200', COMPLETED: 'bg-green-100 text-green-800 border-green-200', CANCELLED: 'bg-red-100 text-red-800 border-red-200', IN: 'bg-green-100 text-green-800 border-green-200', OUT: 'bg-red-100 text-red-800 border-red-200', ADJUSTMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return <Badge variant="outline" className={cn('whitespace-nowrap text-xs', map[status])}>{statusLabel(status)}</Badge>;
}

function shortDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function roleLabel(role?: string) {
  if (role === 'TCP') return 'TCP - Eksekusi Pengiriman';
  if (role === 'USER') return 'USER - Pengajuan';
  if (role === 'ADMIN') return 'ADMIN - Review';
  return 'SUPER ADMIN - Kontrol Penuh';
}

export default function DisplaySystemPage() {
  const { user } = useAuth();
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isTcp = role === 'TCP';
  const [activeTab, setActiveTab] = useState<DisplayTab>(isTcp ? 'returns' : 'products');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ src: string; alt: string } | null>(null);

  const summary = useDisplaySummary();
  const products = useDisplayProducts({ page: 1, limit: 100, search: search || undefined });
  const requests = useDisplayRequests({ status: requestStatusFilter || undefined });
  const returns = useDisplayReturns();
  const movements = useDisplayMovements({ limit: 100 });
  const createSlot = useCreateDisplayProduct();
  const createRequest = useCreateDisplayRequest();
  const reviewRequest = useReviewDisplayRequest();
  const createReturn = useCreateDisplayReturn();
  const updateReturnStatus = useUpdateDisplayReturnStatus();

  const productRows = products.data?.data?.products ?? [];
  const requestRows = requests.data?.data ?? [];
  const returnRows = returns.data?.data ?? [];
  const movementRows = movements.data?.data ?? [];
  const selectedReturn = useMemo(() => returnRows.find((item) => item.id === selectedReturnId) ?? returnRows[0], [returnRows, selectedReturnId]);
  const [requestForm, setRequestForm] = useState({ productId: '', type: 'STOCK_IN', quantity: '1', targetStock: '1', reason: '' });
  const [returnForm, setReturnForm] = useState({ displayProductId: '', recipientName: '', recipientAddress: '', carriedBy: '', condition: 'Perlu dicek', reason: '', notes: '' });

  const pendingRequestCount = requestRows.filter((request) => request.status === 'PENDING').length;
  const activeReturnCount = returnRows.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status)).length;
  const activeDisplayCount = productRows.filter((product) => (product.displayUsed ?? product.stock) > 0).length;
  const tabs: Array<{ key: DisplayTab; label: string; icon: typeof PackageOpen; count?: number; visible?: boolean }> = [
    { key: 'products', label: 'Produk Display', icon: PackageOpen, count: productRows.length, visible: !isTcp },
    { key: 'requests', label: isAdmin ? 'Review Pengajuan' : 'Pengajuan Saya', icon: ClipboardList, count: pendingRequestCount, visible: !isTcp },
    { key: 'returns', label: isTcp ? 'Tugas Retur Display' : 'Retur Display', icon: Truck, count: activeReturnCount, visible: true },
    { key: 'letter', label: 'Surat Jalan', icon: FileText, count: returnRows.length, visible: true },
    { key: 'history', label: 'Riwayat', icon: History, count: movementRows.length, visible: !isTcp || isAdmin },
  ];

  const applySearch = () => setSearch(searchInput.trim());
  const submitRequest = () => createRequest.mutate({ productId: requestForm.productId, type: requestForm.type as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT', quantity: Number(requestForm.quantity), targetStock: Number(requestForm.targetStock), reason: requestForm.reason }, { onSuccess: () => { setRequestForm({ productId: '', type: 'STOCK_IN', quantity: '1', targetStock: '1', reason: '' }); setShowRequestForm(false); setActiveTab('requests'); } });
  const submitReturn = () => {
    const product = productRows.find((row) => row.id === returnForm.displayProductId);
    if (!product?.id) return;
    createReturn.mutate({ recipientName: returnForm.recipientName, recipientAddress: returnForm.recipientAddress, carriedBy: returnForm.carriedBy, notes: returnForm.notes, items: [{ displayProductId: product.id, quantity: 1, condition: returnForm.condition, reason: returnForm.reason, notes: returnForm.notes }] }, { onSuccess: (response) => { setReturnForm({ displayProductId: '', recipientName: '', recipientAddress: '', carriedBy: '', condition: 'Perlu dicek', reason: '', notes: '' }); setSelectedReturnId(response.data.id); setShowReturnForm(false); setActiveTab('letter'); } });
  };
  const ensureSlotThenRequest = (product: DisplayProduct) => {
    if (product.id) { setRequestForm((prev) => ({ ...prev, productId: product.productId || '', type: (product.displayAvailable ?? 0) <= 0 ? 'STOCK_OUT' : 'STOCK_IN', reason: (product.displayAvailable ?? 0) <= 0 ? 'Slot display produk ini sudah habis, perlu tindak lanjut.' : '' })); setShowRequestForm(true); setActiveTab('requests'); return; }
    if (product.productId) createSlot.mutate({ productId: product.productId }, { onSuccess: () => products.refetch() });
  };

  return <div className="space-y-6">
    <style jsx global>{`@media print { body * { visibility: hidden; } #display-letter, #display-letter * { visibility: visible; } #display-letter { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; } .no-print { display: none !important; } }`}</style>
    <Breadcrumbs items={[{ label: 'Sistem Display' }]} />
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold tracking-tight text-gradient">Sistem Display</h1><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">1 Slot per Produk</Badge><Badge variant="outline">{roleLabel(role)}</Badge></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Produk display diambil dari data produk asli. Setiap produk punya 1 slot display khusus dan tidak mengubah stok penjualan.</p></div><div className="flex flex-col gap-2 sm:flex-row no-print">{!isTcp && <Button variant="outline" onClick={() => { setShowRequestForm(true); setActiveTab('requests'); }}><Send className="mr-2 h-4 w-4" /> Buat Pengajuan</Button>}{!isTcp && <Button onClick={() => { setShowReturnForm(true); setActiveTab('returns'); }}><Truck className="mr-2 h-4 w-4" /> Buat Retur Display</Button>}</div></div>
    <div className="grid gap-4 md:grid-cols-4 no-print"><Summary title="Produk Asli" value={summary.data?.data?.totalProducts ?? productRows.length} note="Sumber data master produk" /><Summary title="Sedang Display" value={summary.data?.data?.activeSlots ?? activeDisplayCount} note="Slot terpakai dari jatah 1" /><Summary title="Menunggu Review" value={summary.data?.data?.pendingRequests ?? pendingRequestCount} note="Pengajuan display aktif" /><Summary title="Retur Aktif" value={summary.data?.data?.activeReturns ?? activeReturnCount} note="Perlu dikirim/diterima" /></div>
    <RoleGuide role={role} isAdmin={isAdmin} isTcp={isTcp} />
    <Card className="no-print"><CardContent className="pt-4"><div className="flex flex-wrap gap-2">{tabs.filter((tab) => tab.visible !== false).map((tab) => { const Icon = tab.icon; return <Button key={tab.key} type="button" variant={activeTab === tab.key ? 'default' : 'outline'} onClick={() => setActiveTab(tab.key)} className="gap-2"><Icon className="h-4 w-4" />{tab.label}{tab.count !== undefined && <Badge variant="secondary" className="ml-1">{tab.count}</Badge>}</Button>; })}</div></CardContent></Card>
    {activeTab === 'products' && <ProductsTab productRows={productRows} isLoading={products.isLoading} searchInput={searchInput} setSearchInput={setSearchInput} applySearch={applySearch} reset={() => { setSearch(''); setSearchInput(''); }} ensureSlotThenRequest={ensureSlotThenRequest} setPhotoPreview={setPhotoPreview} />}
    {activeTab === 'requests' && <RequestsTab isAdmin={isAdmin} showForm={showRequestForm} setShowForm={setShowRequestForm} productRows={productRows} requestForm={requestForm} setRequestForm={setRequestForm} submitRequest={submitRequest} createPending={createRequest.isPending} requestRows={requestRows} reviewRequest={reviewRequest} requestStatusFilter={requestStatusFilter} setRequestStatusFilter={setRequestStatusFilter} />}
    {activeTab === 'returns' && <ReturnsTab isAdmin={isAdmin} isTcp={isTcp} showForm={showReturnForm} setShowForm={setShowReturnForm} productRows={productRows} returnRows={returnRows} returnForm={returnForm} setReturnForm={setReturnForm} submitReturn={submitReturn} createPending={createReturn.isPending} setSelectedReturnId={setSelectedReturnId} setActiveTab={setActiveTab} updateReturnStatus={updateReturnStatus} />}
    {activeTab === 'letter' && <div className="space-y-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print"><div><h2 className="text-lg font-semibold">Surat Jalan Retur Display</h2><p className="text-sm text-muted-foreground">Pilih surat jalan lalu cetak untuk dibawa bersama barang.</p></div><div className="flex gap-2"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedReturn?.id || ''} onChange={(e) => setSelectedReturnId(e.target.value)}>{returnRows.map((item) => <option key={item.id} value={item.id}>{item.letterNumber} - {item.recipientName}</option>)}</select><Button onClick={() => window.print()} disabled={!selectedReturn}><Printer className="mr-2 h-4 w-4" />Cetak</Button></div></div>{selectedReturn ? <LetterTemplate displayReturn={selectedReturn} /> : <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada surat jalan. Buat Retur Display terlebih dahulu.</CardContent></Card>}</div>}
    {activeTab === 'history' && <HistoryTab movementRows={movementRows} />}
    <PhotoPreview photo={photoPreview} onClose={() => setPhotoPreview(null)} />
    {!isTcp && activeDisplayCount === 0 && activeTab === 'products' && <Card className="border-dashed no-print"><CardContent className="flex gap-3 py-5 text-sm text-muted-foreground"><AlertTriangle className="h-5 w-5 text-yellow-600" /><div><div className="font-medium text-foreground">Belum ada produk yang sedang display.</div><div>Pilih produk, siapkan slot, lalu buat pengajuan agar alurnya tercatat dan mudah direview.</div></div></CardContent></Card>}
  </div>;
}


function Summary({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">{note}</p></CardContent>
    </Card>
  );
}

function RoleGuide({ role, isAdmin, isTcp }: { role?: string; isAdmin: boolean; isTcp: boolean }) {
  const guide = isTcp
    ? { title: 'Fokus TCP', desc: 'Lihat tugas Retur Display, buka Surat Jalan, lalu tandai barang dikirim atau diterima.', tone: 'border-blue-200 bg-blue-50/60 text-blue-900' }
    : isAdmin
      ? { title: 'Fokus Admin / Super Admin', desc: 'Data Display, Review Pengajuan, dan Retur Display dipisah per tab supaya tidak padat.', tone: 'border-primary/20 bg-primary/5 text-primary' }
      : { title: 'Fokus User', desc: 'Lihat stok display, buat pengajuan jika perlu, dan buat Retur Display jika barang display bermasalah.', tone: 'border-amber-200 bg-amber-50/70 text-amber-900' };
  return (
    <Card className={cn('no-print border', guide.tone)}>
      <CardContent className="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold">{guide.title}</div>
          <div className="text-sm opacity-80">{guide.desc}</div>
        </div>
        <Badge variant="outline" className="w-fit bg-white/70">{role || 'ROLE'}</Badge>
      </CardContent>
    </Card>
  );
}

function ProductPhoto({ product, onPreview }: { product: DisplayProduct; onPreview: (photo: { src: string; alt: string }) => void }) {
  const imagePath = product.sourceProduct?.imageUrl;
  const imageUrl = getImageUrl(imagePath);
  return (
    <button
      type="button"
      disabled={!imageUrl}
      onClick={() => imageUrl && onPreview({ src: imageUrl, alt: product.name })}
      className="h-14 w-14 overflow-hidden rounded-lg border bg-muted text-left transition hover:ring-2 hover:ring-primary disabled:cursor-default disabled:hover:ring-0"
      title={imageUrl ? 'Klik untuk lihat foto penuh' : 'Tidak ada foto'}
    >
      <ImageWithFallback src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
    </button>
  );
}

function ProductsTab({ productRows, isLoading, searchInput, setSearchInput, applySearch, reset, ensureSlotThenRequest, setPhotoPreview }: any) {
  return (
    <div className="space-y-4 no-print">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Produk Display</h2>
              <p className="text-sm text-muted-foreground">Ringkas: 1/1 berarti stok display ada, 0/1 berarti habis dan wajib pengajuan.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }} placeholder="Cari nama/SKU produk..." className="sm:w-64" />
              <Button variant="outline" onClick={applySearch}><Search className="mr-2 h-4 w-4" />Cari</Button>
              <Button variant="ghost" onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" />Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></CardContent></Card>}
        {!isLoading && productRows.map((product: DisplayProduct) => {
          const used = product.displayUsed ?? product.stock;
          const limit = product.slotLimit ?? 1;
          const hasDisplayStock = used > 0;
          return (
            <Card key={product.productId || product.id || product.sku} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <ProductPhoto product={product} onPreview={setPhotoPreview} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{product.name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                    <div className="mt-2 flex flex-wrap gap-1">{statusBadge(product.status)} {!hasDisplayStock && <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Stok Display Habis</Badge>}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-sm">
                  <div><div className="text-xs text-muted-foreground">Penjualan</div><div className="font-semibold">{product.salesStock ?? '-'} {product.unit}</div></div>
                  <div><div className="text-xs text-muted-foreground">Display</div><div className="font-semibold">{used}/{limit}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kategori</div><div className="truncate font-semibold">{product.category?.name || '-'}</div></div>
                </div>
                <Button className="mt-4 w-full" variant={hasDisplayStock ? 'outline' : 'default'} onClick={() => ensureSlotThenRequest(product)}>
                  {product.id ? (hasDisplayStock ? 'Ajukan Perubahan' : 'Buat Pengajuan') : 'Siapkan Slot'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && productRows.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-10 text-center text-muted-foreground">Produk tidak ditemukan.</CardContent></Card>}
      </div>
    </div>
  );
}

function RequestsTab(props: any) {
  const { isAdmin, showForm, setShowForm, productRows, requestForm, setRequestForm, submitRequest, createPending, requestRows, reviewRequest, requestStatusFilter, setRequestStatusFilter } = props;
  return (
    <div className="space-y-4 no-print">
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Form Pengajuan Display</DialogTitle><DialogDescription>Isi singkat saja. Admin akan review dari tab pengajuan.</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1"><span className="text-sm font-medium">Pilih Produk</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={requestForm.productId} onChange={(e) => setRequestForm((p: any) => ({ ...p, productId: e.target.value }))}><option value="">Pilih produk...</option>{productRows.map((p: DisplayProduct) => <option key={p.productId || p.id || p.sku} value={p.productId || ''}>{p.name} - Display {(p.displayUsed ?? p.stock)}/{p.slotLimit ?? 1}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-medium">Jenis Pengajuan</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={requestForm.type} onChange={(e) => setRequestForm((p: any) => ({ ...p, type: e.target.value }))}><option value="STOCK_IN">Pakai/Tambah Stok Display</option><option value="STOCK_OUT">Kosongkan Stok Display</option><option value="ADJUSTMENT">Atur Stok Display</option></select></label>
            <label className="space-y-1"><span className="text-sm font-medium">Jumlah</span><Input type="number" min="1" max="1" value={requestForm.quantity} onChange={(e) => setRequestForm((p: any) => ({ ...p, quantity: e.target.value }))} /><span className="text-xs text-muted-foreground">Saat ini display hanya 1 per produk.</span></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Alasan</span><Textarea value={requestForm.reason} onChange={(e) => setRequestForm((p: any) => ({ ...p, reason: e.target.value }))} placeholder="Contoh: stok display habis, perlu ganti barang display." /></label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button><Button onClick={submitRequest} disabled={!requestForm.productId || !requestForm.reason || createPending}>{createPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Pengajuan</Button></div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>{isAdmin ? 'Review Pengajuan Display' : 'Pengajuan Display Saya'}</CardTitle><select className="h-10 rounded-md border bg-background px-3 text-sm" value={requestStatusFilter || 'all'} onChange={(e) => setRequestStatusFilter(e.target.value === 'all' ? '' : e.target.value)}>{requestStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></CardHeader>
        <CardContent className="space-y-3">
          {requestRows.map((request: any) => <div key={request.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="font-semibold">{request.product?.sourceProduct?.name || request.product?.name || '-'}</div><div className="text-xs text-muted-foreground">{request.product?.sourceProduct?.sku || request.product?.sku} • {request.requester?.fullName || request.requester?.username || '-'}</div><p className="mt-2 text-sm">{request.reason}</p></div><div className="flex flex-wrap items-center gap-2">{statusBadge(request.type)}{statusBadge(request.status)}</div></div>{isAdmin && request.status === 'PENDING' && <div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" className="text-green-700" onClick={() => reviewRequest.mutate({ id: request.id, action: 'approve' })}><CheckCircle2 className="mr-1 h-4 w-4" />Setujui</Button><Button size="sm" variant="outline" className="text-red-700" onClick={() => reviewRequest.mutate({ id: request.id, action: 'reject', rejectionReason: 'Pengajuan belum sesuai.' })}><XCircle className="mr-1 h-4 w-4" />Tolak</Button></div>}</div>)}
          {requestRows.length === 0 && <div className="py-8 text-center text-muted-foreground">Belum ada pengajuan display.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnsTab(props: any) {
  const { isAdmin, isTcp, showForm, setShowForm, productRows, returnRows, returnForm, setReturnForm, submitReturn, createPending, setSelectedReturnId, setActiveTab, updateReturnStatus } = props;
  return (
    <div className="space-y-4 no-print">
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Buat Retur Display + Surat Jalan</DialogTitle><DialogDescription>Surat jalan otomatis dibuat setelah retur disimpan.</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1"><span className="text-sm font-medium">Barang Display</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={returnForm.displayProductId} onChange={(e) => setReturnForm((p: any) => ({ ...p, displayProductId: e.target.value }))}><option value="">Pilih barang...</option>{productRows.filter((p: DisplayProduct) => !!p.id && (p.displayUsed ?? p.stock) > 0).map((p: DisplayProduct) => <option key={p.id!} value={p.id!}>{p.name} - {p.sku}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm font-medium">Kondisi</span><Input value={returnForm.condition} onChange={(e) => setReturnForm((p: any) => ({ ...p, condition: e.target.value }))} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Kepada</span><Input value={returnForm.recipientName} onChange={(e) => setReturnForm((p: any) => ({ ...p, recipientName: e.target.value }))} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Dibawa Oleh</span><Input value={returnForm.carriedBy} onChange={(e) => setReturnForm((p: any) => ({ ...p, carriedBy: e.target.value }))} /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Alamat Tujuan</span><Textarea value={returnForm.recipientAddress} onChange={(e) => setReturnForm((p: any) => ({ ...p, recipientAddress: e.target.value }))} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Alasan Retur</span><Textarea value={returnForm.reason} onChange={(e) => setReturnForm((p: any) => ({ ...p, reason: e.target.value }))} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Catatan</span><Textarea value={returnForm.notes} onChange={(e) => setReturnForm((p: any) => ({ ...p, notes: e.target.value }))} /></label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button><Button onClick={submitReturn} disabled={!returnForm.displayProductId || !returnForm.recipientName || !returnForm.recipientAddress || !returnForm.reason || createPending}>{createPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat Surat Jalan</Button></div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>{isTcp ? 'Tugas Retur Display untuk TCP' : 'Daftar Retur Display'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {returnRows.map((item: DisplayReturn) => <div key={item.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="font-semibold">{item.letterNumber}</div><div className="text-xs text-muted-foreground">{shortDate(item.letterDate)} • Kepada {item.recipientName}</div><div className="mt-2 text-sm">{item.items?.map((row) => row.productNameSnapshot).join(', ') || '-'}</div></div><div>{statusBadge(item.status)}</div></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setSelectedReturnId(item.id); setActiveTab('letter'); }}>Surat Jalan</Button>{(isTcp || isAdmin) && item.status === 'READY_TO_SEND' && <Button size="sm" onClick={() => updateReturnStatus.mutate({ id: item.id, status: 'SENT' })}>Tandai Dikirim</Button>}{(isTcp || isAdmin) && item.status === 'SENT' && <Button size="sm" onClick={() => updateReturnStatus.mutate({ id: item.id, status: 'RECEIVED' })}>Tandai Diterima</Button>}{isAdmin && item.status === 'RECEIVED' && <Button size="sm" onClick={() => updateReturnStatus.mutate({ id: item.id, status: 'COMPLETED' })}>Selesaikan</Button>}</div></div>)}
          {returnRows.length === 0 && <div className="py-8 text-center text-muted-foreground">Belum ada Retur Display.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab({ movementRows }: any) {
  return <Card className="no-print"><CardHeader><CardTitle>Riwayat Slot Display</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Produk</TableHead><TableHead>Tipe</TableHead><TableHead>Perubahan</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader><TableBody>{movementRows.map((movement: any) => <TableRow key={movement.id}><TableCell>{shortDate(movement.createdAt)}</TableCell><TableCell>{movement.product?.sourceProduct?.name || movement.product?.name || '-'}</TableCell><TableCell>{statusBadge(movement.type)}</TableCell><TableCell>{movement.stockBefore} - {movement.stockAfter}</TableCell><TableCell>{movement.notes || '-'}</TableCell></TableRow>)}{movementRows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada riwayat display.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

function PhotoPreview({ photo, onClose }: { photo: { src: string; alt: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!photo} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-5xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Preview foto produk</DialogTitle>
        <DialogDescription className="sr-only">Foto produk tampil penuh dengan background gelap.</DialogDescription>
        <button type="button" onClick={onClose} className="fixed inset-0 z-[-1] bg-black/90" aria-label="Tutup preview foto" />
        <div className="relative flex max-h-[90vh] items-center justify-center rounded-xl bg-black/20 p-3">
          {photo && <img src={photo.src} alt={photo.alt} className="max-h-[86vh] max-w-full rounded-lg object-contain shadow-2xl" />}
          <Button type="button" variant="secondary" size="sm" className="absolute right-4 top-4" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LetterTemplate({ displayReturn }: { displayReturn: DisplayReturn }) { return <Card id="display-letter" className="mx-auto max-w-5xl bg-white text-black shadow-sm"><CardContent className="space-y-8 p-10"><div className="grid grid-cols-2 gap-8"><div className="space-y-2"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-black font-bold">LN</div><div><div className="text-2xl font-bold tracking-wide">LUNAREA</div><div className="text-sm">Furniture & Home Living</div></div></div><div className="text-sm leading-relaxed">Alamat Lunarea<br />Jl. Operasional Lunarea<br />Kontak: -</div></div><div className="space-y-2 text-sm"><div className="font-semibold">Kepada:</div><div className="text-lg font-bold">{displayReturn.recipientName}</div><div className="whitespace-pre-line leading-relaxed">{displayReturn.recipientAddress}</div></div></div><div className="text-center"><h2 className="text-2xl font-bold underline">SURAT JALAN RETUR DISPLAY</h2><div className="mt-2 text-sm">No. Surat: <span className="font-semibold">{displayReturn.letterNumber}</span></div><div className="text-sm">Tanggal: {shortDate(displayReturn.letterDate)}</div></div><table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-100"><th className="border border-black p-2 text-left">No</th><th className="border border-black p-2 text-left">Nama Barang</th><th className="border border-black p-2 text-left">Varian</th><th className="border border-black p-2 text-left">Jumlah</th><th className="border border-black p-2 text-left">Kondisi</th><th className="border border-black p-2 text-left">Keterangan</th></tr></thead><tbody>{displayReturn.items?.map((item, index) => <tr key={item.id}><td className="border border-black p-2">{index + 1}</td><td className="border border-black p-2">{item.productNameSnapshot}<div className="text-xs">SKU: {item.skuSnapshot}</div></td><td className="border border-black p-2">{item.variantSnapshot || '-'}</td><td className="border border-black p-2">{item.quantity}</td><td className="border border-black p-2">{item.condition}</td><td className="border border-black p-2">{item.reason}</td></tr>)}{(!displayReturn.items || displayReturn.items.length === 0) && <tr><td colSpan={6} className="border border-black p-4 text-center">Tidak ada item.</td></tr>}</tbody></table>{displayReturn.notes && <div className="text-sm"><span className="font-semibold">Catatan:</span> {displayReturn.notes}</div>}<div className="grid grid-cols-3 gap-8 pt-10 text-center text-sm"><div><div>Mengetahui</div><div className="h-24" /><div className="border-t border-black pt-2">Admin</div></div><div><div>Diserahkan Oleh</div><div className="h-24" /><div className="border-t border-black pt-2">{displayReturn.carriedBy || 'TCP/Kurir'}</div></div><div><div>Diterima Oleh</div><div className="h-24" /><div className="border-t border-black pt-2">Penerima</div></div></div></CardContent></Card>; }
