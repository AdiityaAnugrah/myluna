'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CheckCircle2, ChevronDown, ChevronUp, Handshake, Loader2, Plus, Printer, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProducts } from '@/lib/hooks/useProducts';
import {
  useAdjustCenterStock,
  useCenterStocks,
  useCreateInventoryLoan,
  useInventoryLoans,
  useReturnInventoryLoan,
} from '@/lib/hooks/useInventoryLoans';
import type { InventoryLoanItemCondition, Product } from '@/types';

type FormItem = {
  productId: string;
  variantName: string;
  quantity: number;
  condition: InventoryLoanItemCondition;
  notes: string;
};

const conditionLabels: Record<InventoryLoanItemCondition, string> = {
  GOOD: 'Baik',
  MINOR_DAMAGE: 'Rusak ringan',
  DAMAGED: 'Rusak',
  OTHER: 'Lainnya',
};

const today = () => new Date().toISOString().slice(0, 10);

function SignaturePad({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
  }, [value]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange('')}>
          Bersihkan
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        className="h-32 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-[linear-gradient(0deg,#fff,#fff),repeating-linear-gradient(0deg,transparent,transparent_30px,#f1f5f9_31px)] shadow-inner"
        onPointerDown={(event) => {
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const ctx = event.currentTarget.getContext('2d')!;
          const p = point(event);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = event.currentTarget.getContext('2d')!;
          const p = point(event);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          save();
        }}
        onPointerUp={(event) => {
          drawing.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
          save();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          save();
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground">Tanda tangan langsung di area putih.</p>
    </div>
  );
}

export default function InventoryLoansPage() {
  const { user } = useAuth();
  const canCreate = ['ADMIN_ORDER', 'ADMIN', 'SUPER_ADMIN', 'DEV'].includes(String(user?.role || '').toUpperCase());
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [showCenterPanel, setShowCenterPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    direction: 'FROM_CENTER' as const,
    loanDate: today(),
    borrowerName: '',
    targetName: '',
    notes: '',
    submittedSignatureName: '',
    submittedSignature: '',
    acknowledgedSignatureName: '',
    acknowledgedSignature: '',
    receivedSignatureName: '',
    receivedSignature: '',
  });
  const [items, setItems] = useState<FormItem[]>([{ productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' }]);
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [centerAdjust, setCenterAdjust] = useState({ productId: '', variantName: '', quantity: 0, type: 'SET' as 'SET' | 'IN' | 'OUT' });

  const { data, isLoading } = useInventoryLoans({
    page: 1,
    limit: 50,
    status: statusFilter || undefined,
    direction: 'FROM_CENTER',
    search: search || undefined,
  });
  const { data: productsData } = useProducts({ limit: 10000 });
  const { data: centerStocksData } = useCenterStocks();
  const createLoan = useCreateInventoryLoan();
  const returnLoan = useReturnInventoryLoan();
  const adjustCenter = useAdjustCenterStock();

  const products = productsData?.data?.products || [];
  const loans = data?.data?.loans || [];
  const centerStocks = centerStocksData?.data || [];

  const productMap = useMemo(() => new Map(products.map((product: Product) => [product.id, product])), [products]);
  const centerStockMap = useMemo(() => {
    const map = new Map<string, number>();
    centerStocks.forEach((row) => map.set(`${row.productId}::${row.variantName || ''}`, Number(row.stock || 0)));
    return map;
  }, [centerStocks]);

  const resetForm = () => {
    setForm({
      direction: 'FROM_CENTER',
      loanDate: today(),
      borrowerName: '',
      targetName: '',
      notes: '',
      submittedSignatureName: '',
      submittedSignature: '',
      acknowledgedSignatureName: '',
      acknowledgedSignature: '',
      receivedSignatureName: '',
      receivedSignature: '',
    });
    setItems([{ productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' }]);
    setFormStep(1);
  };

  const directionLabel = (direction: string) =>
    direction === 'FROM_CENTER' ? 'Pinjam dari Pusat/TCP' : 'Retur / stok keluar ke pusat';

  const stockText = (product?: Product, variantName?: string | null) => {
    if (!product) return '-';
    const variant = (product.variants || product.variantItems || []).find((v) => v.value === variantName);
    const online = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    const center = centerStockMap.get(`${product.id}::${variantName || ''}`) || 0;
    return `Online ${online} • Pusat ${center}`;
  };

  const selectedItemsReady = items.filter((item) => item.productId && Number(item.quantity) > 0).length;
  const previewItems = items.filter((item) => item.productId && Number(item.quantity) > 0);
  const formSteps = [
    { number: 1, title: 'Informasi', helper: 'Tujuan peminjaman' },
    { number: 2, title: 'Barang', helper: 'Produk & kondisi' },
    { number: 3, title: 'TTD', helper: 'Nama & tanda tangan' },
    { number: 4, title: 'Preview', helper: 'Cek final' },
  ];
  const stepReady = {
    1: Boolean(form.loanDate && form.borrowerName && form.targetName),
    2: selectedItemsReady > 0,
    3: true,
    4: Boolean(form.loanDate && form.borrowerName && form.targetName && selectedItemsReady > 0),
  } as Record<number, boolean>;
  const canContinue = stepReady[formStep];

  const submit = async () => {
    const validItems = items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        variantName: item.variantName || null,
        quantity: Number(item.quantity),
        condition: item.condition,
        notes: item.notes || null,
      }));

    await createLoan.mutateAsync({
      ...form,
      notes: form.notes || null,
      submittedSignatureName: form.submittedSignatureName || null,
      submittedSignature: form.submittedSignature || null,
      acknowledgedSignatureName: form.acknowledgedSignatureName || null,
      acknowledgedSignature: form.acknowledgedSignature || null,
      receivedSignatureName: form.receivedSignatureName || null,
      receivedSignature: form.receivedSignature || null,
      items: validItems,
    });
    setShowForm(false);
    resetForm();
  };

  const printLoan = (loan: any) => {
    const rows = (loan.items || [])
      .map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product?.name || '-'}${item.variantName ? ` (${item.variantName})` : ''}</td>
          <td>${item.quantity}</td>
          <td>${conditionLabels[item.condition as InventoryLoanItemCondition] || item.condition}</td>
        </tr>
      `)
      .join('');
    const signature = (title: string, name?: string | null, image?: string | null) => `
      <div class="sig"><div>${title}</div><div class="sigbox">${image ? `<img src="${image}" />` : ''}</div><strong>${name || '&nbsp;'}</strong></div>
    `;
    const html = `
      <html><head><title>${loan.loanNumber}</title><style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111} h1{text-align:center;font-size:22px;margin:0 0 24px}
        .meta{width:100%;margin-bottom:18px}.meta td{padding:3px 6px} table.items{width:100%;border-collapse:collapse;margin:12px 0 18px}
        .items th,.items td{border:1px solid #111;padding:8px;font-size:13px}.note{border:1px solid #111;min-height:70px;padding:8px;margin:16px 0}
        .signatures{display:flex;justify-content:space-between;margin-top:28px;gap:24px}.sig{text-align:center;flex:1}.sigbox{height:90px;display:flex;align-items:center;justify-content:center}.sigbox img{max-height:80px;max-width:180px}
        @media print{button{display:none} body{padding:12px}}
      </style></head><body>
        <button onclick="window.print()">Print</button><h1>FORM PINJAMAN BARANG</h1>
        <table class="meta"><tr><td width="160">No Form</td><td>: ${loan.loanNumber}</td></tr><tr><td>Tanggal</td><td>: ${format(new Date(loan.loanDate), 'dd MMMM yyyy')}</td></tr><tr><td>Nama Peminjam</td><td>: ${loan.borrowerName}</td></tr><tr><td>Ditujukan Pada</td><td>: ${loan.targetName}</td></tr><tr><td>Arah</td><td>: ${directionLabel(loan.direction)}</td></tr></table>
        <table class="items"><thead><tr><th>No</th><th>Nama Barang</th><th>Unit</th><th>Kondisi saat dipinjam</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="note"><strong>Catatan:</strong><br/>${loan.notes || '-'}</div>
        <div class="signatures">${signature('Mengajukan', loan.submittedSignatureName, loan.submittedSignature)}${signature('Mengetahui', loan.acknowledgedSignatureName, loan.acknowledgedSignature)}${signature('Menerima', loan.receivedSignatureName, loan.receivedSignature)}</div>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const renderLoanForm = () => (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b bg-gradient-to-r from-orange-50 via-white to-slate-50 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Form Baru</div>
            <h2 className="text-2xl font-bold text-slate-900">Form Pinjaman Barang</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Form ini khusus saat toko/Admin Order meminjam barang dari Pusat/TCP. Stok pusat berkurang dan stok toko bertambah otomatis.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setShowForm(false)} className="self-start">
            <X className="mr-2 h-4 w-4" /> Tutup
          </Button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 p-5 md:p-6">
          <div className="grid gap-2 rounded-2xl border bg-slate-50 p-2 md:grid-cols-4">
            {formSteps.map((step) => {
              const active = formStep === step.number;
              const done = step.number < formStep;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setFormStep(step.number)}
                  className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active ? 'bg-white shadow-sm ring-2 ring-orange-200' : 'hover:bg-white/70'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-orange-600 text-white' : 'bg-white text-slate-500'}`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                    <span className="block text-xs text-muted-foreground">{step.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {formStep === 1 && (
          <section className="rounded-2xl border bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 font-bold text-white">1</div>
              <div><h3 className="font-semibold">Informasi Pinjaman</h3><p className="text-sm text-muted-foreground">Khusus barang yang dipinjam toko dari Pusat/TCP.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Jenis Transaksi</Label>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                  <div className="font-semibold">Toko meminjam barang dari Pusat/TCP</div>
                  <div className="mt-1 text-xs">Stok pusat/TCP berkurang, stok toko/sistem bertambah. Jika barang dari toko dikirim ke pusat, gunakan alur retur/stok keluar, bukan form pinjaman.</div>
                </div>
              </div>
              <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.loanDate} onChange={(e) => setForm({ ...form, loanDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nama Peminjam</Label><Input value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} placeholder="Contoh: Lokal Jateng / TCP Pusat" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Ditujukan Pada</Label><Input value={form.targetName} onChange={(e) => setForm({ ...form, targetName: e.target.value })} placeholder="Contoh: Divisi Online / Pusat" /></div>
            </div>
          </section>
          )}

          {formStep === 2 && (
          <section className="rounded-2xl border p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 font-bold text-white">2</div>
                <div><h3 className="font-semibold">Daftar Barang</h3><p className="text-sm text-muted-foreground">Pilih produk, varian, jumlah, dan kondisi barang.</p></div>
              </div>
              <Button type="button" variant="outline" onClick={() => setItems([...items, { productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' }])}>Tambah baris</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => {
                const selectedProduct = productMap.get(item.productId);
                const variants = selectedProduct?.variants || selectedProduct?.variantItems || [];
                return (
                  <div key={index} className="rounded-2xl border bg-slate-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Barang #{index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== index))} disabled={items.length === 1}><Trash2 className="mr-1 h-4 w-4 text-red-500" />Hapus</Button></div>
                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-4"><Label className="text-xs">Produk</Label><Select value={item.productId || 'none'} onValueChange={(value) => { const next = [...items]; next[index] = { ...item, productId: value === 'none' ? '' : value, variantName: '' }; setItems(next); }}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent><SelectItem value="none">Pilih produk</SelectItem>{products.map((product: Product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="md:col-span-2"><Label className="text-xs">Varian</Label><Select value={item.variantName || 'none'} onValueChange={(value) => { const next = [...items]; next[index] = { ...item, variantName: value === 'none' ? '' : value }; setItems(next); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa varian</SelectItem>{variants.map((variant) => <SelectItem key={variant.id} value={variant.value}>{variant.value} • stok {variant.stock}</SelectItem>)}</SelectContent></Select></div>
                      <div className="md:col-span-2"><Label className="text-xs">Stok</Label><div className="flex h-10 items-center rounded-md border bg-white px-3 text-xs text-muted-foreground">{stockText(selectedProduct, item.variantName)}</div></div>
                      <div className="md:col-span-1"><Label className="text-xs">Unit</Label><Input type="number" min={1} value={item.quantity} onChange={(e) => { const next = [...items]; next[index] = { ...item, quantity: Number(e.target.value) }; setItems(next); }} /></div>
                      <div className="md:col-span-3"><Label className="text-xs">Kondisi</Label><Select value={item.condition} onValueChange={(value: InventoryLoanItemCondition) => { const next = [...items]; next[index] = { ...item, condition: value }; setItems(next); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(conditionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                      <div className="md:col-span-12"><Label className="text-xs">Catatan barang</Label><Input value={item.notes} onChange={(e) => { const next = [...items]; next[index] = { ...item, notes: e.target.value }; setItems(next); }} placeholder="Opsional, contoh: warna pink, dus lengkap, ada gores kecil" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {formStep === 3 && (
          <section className="rounded-2xl border bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 font-bold text-white">3</div><div><h3 className="font-semibold">Catatan & Tanda Tangan</h3><p className="text-sm text-muted-foreground">Nama dan TTD akan masuk ke form cetak.</p></div></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Mengajukan</Label><Input value={form.submittedSignatureName} onChange={(e) => setForm({ ...form, submittedSignatureName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Mengetahui</Label><Input value={form.acknowledgedSignatureName} onChange={(e) => setForm({ ...form, acknowledgedSignatureName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Menerima</Label><Input value={form.receivedSignatureName} onChange={(e) => setForm({ ...form, receivedSignatureName: e.target.value })} /></div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SignaturePad label="TTD Mengajukan" value={form.submittedSignature} onChange={(value) => setForm({ ...form, submittedSignature: value })} />
              <SignaturePad label="TTD Mengetahui" value={form.acknowledgedSignature} onChange={(value) => setForm({ ...form, acknowledgedSignature: value })} />
              <SignaturePad label="TTD Menerima" value={form.receivedSignature} onChange={(value) => setForm({ ...form, receivedSignature: value })} />
            </div>
            <div className="mt-4 space-y-2"><Label>Catatan umum</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contoh: Diminta untuk diretur ke pusat" className="min-h-24" /></div>
          </section>
          )}

          {formStep === 4 && (
          <section className="rounded-2xl border bg-slate-100 p-3 md:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Preview Akhir Seperti PDF</h3>
                <p className="text-sm text-muted-foreground">Pastikan nama, barang, jumlah, kondisi, dan tanda tangan sudah benar sebelum disimpan.</p>
              </div>
              <Badge className="w-fit bg-orange-600 text-white">DRAFT</Badge>
            </div>
            <div className="mx-auto max-w-4xl rounded-sm bg-white p-5 text-slate-950 shadow-xl ring-1 ring-slate-200 md:p-8">
              <div className="border-b border-slate-900 pb-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Lunarea Furniture</div>
                <h2 className="mt-1 text-xl font-black uppercase tracking-wide md:text-2xl">Form Pinjaman Barang</h2>
                <div className="mt-1 text-xs text-slate-500">Preview sebelum nomor form resmi dibuat</div>
              </div>
              <div className="mt-5 grid gap-2 text-sm md:grid-cols-2">
                <div><span className="inline-block w-32 text-slate-500">No Form</span>: DRAFT</div>
                <div><span className="inline-block w-32 text-slate-500">Tanggal</span>: {form.loanDate ? format(new Date(form.loanDate), 'dd MMMM yyyy') : '-'}</div>
                <div><span className="inline-block w-32 text-slate-500">Nama Peminjam</span>: <strong>{form.borrowerName || '-'}</strong></div>
                <div><span className="inline-block w-32 text-slate-500">Ditujukan Pada</span>: <strong>{form.targetName || '-'}</strong></div>
                <div className="md:col-span-2"><span className="inline-block w-32 text-slate-500">Arah</span>: {directionLabel(form.direction)}</div>
              </div>
              <div className="mt-5 overflow-hidden rounded-lg border border-slate-900">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-100">
                    <tr><th className="border-b border-r border-slate-900 p-2 text-left">No</th><th className="border-b border-r border-slate-900 p-2 text-left">Nama Barang</th><th className="border-b border-r border-slate-900 p-2 text-center">Unit</th><th className="border-b border-slate-900 p-2 text-left">Kondisi saat dipinjam</th></tr>
                  </thead>
                  <tbody>
                    {previewItems.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-slate-500">Belum ada barang valid.</td></tr>
                    ) : previewItems.map((item, index) => {
                      const product = productMap.get(item.productId);
                      return <tr key={`${item.productId}-${index}`}><td className="border-r border-t border-slate-300 p-2">{index + 1}</td><td className="border-r border-t border-slate-300 p-2"><strong>{product?.name || '-'}</strong>{item.variantName ? <span> ({item.variantName})</span> : null}{item.notes ? <div className="text-xs text-slate-500">Catatan: {item.notes}</div> : null}<div className="text-xs text-slate-500">{stockText(product, item.variantName)}</div></td><td className="border-r border-t border-slate-300 p-2 text-center font-semibold">{item.quantity}</td><td className="border-t border-slate-300 p-2">{conditionLabels[item.condition]}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 min-h-20 rounded-lg border border-slate-900 p-3 text-sm"><strong>Catatan:</strong><br />{form.notes || '-'}</div>
              <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs md:gap-8">
                {[
                  ['Mengajukan', form.submittedSignatureName, form.submittedSignature],
                  ['Mengetahui', form.acknowledgedSignatureName, form.acknowledgedSignature],
                  ['Menerima', form.receivedSignatureName, form.receivedSignature],
                ].map(([title, name, image]) => (
                  <div key={title}>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-2 flex h-20 items-center justify-center border-b border-slate-900">{image ? <img src={String(image)} alt={`TTD ${title}`} className="max-h-16 max-w-full object-contain" /> : <span className="text-slate-400">Belum TTD</span>}</div>
                    <div className="mt-2 font-bold">{String(name || '................')}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          )}
        </div>

        <aside className="border-t bg-slate-50/80 p-5 lg:border-l lg:border-t-0">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-muted-foreground">Ringkasan Form</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span>Arah</span><strong className="text-right">{directionLabel(form.direction)}</strong></div>
                <div className="flex justify-between"><span>Barang valid</span><strong>{selectedItemsReady}</strong></div>
                <div className="flex justify-between"><span>Tanggal</span><strong>{form.loanDate}</strong></div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">4</div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Preview Akhir</div>
                  <div className="text-xs text-muted-foreground">Cek ulang sebelum simpan</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Peminjam</div>
                  <div className="mt-1 font-semibold">{form.borrowerName || 'Belum diisi'}</div>
                  <div className="text-xs text-muted-foreground">Tujuan: {form.targetName || 'Belum diisi'}</div>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {previewItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">Belum ada barang valid</div>
                  ) : (
                    previewItems.map((item, index) => {
                      const product = productMap.get(item.productId);
                      return (
                        <div key={`${item.productId}-${index}`} className="rounded-xl border bg-white p-3">
                          <div className="text-xs font-semibold text-orange-700">#{index + 1}</div>
                          <div className="font-semibold">{product?.name || 'Produk belum dipilih'}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.variantName || 'Tanpa varian'} • {item.quantity} unit • {conditionLabels[item.condition]}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{stockText(product, item.variantName)}</div>
                          {item.notes ? <div className="mt-1 text-xs text-slate-600">Catatan: {item.notes}</div> : null}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`rounded-lg border p-2 ${form.submittedSignature ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-muted-foreground'}`}>TTD<br />Mengajukan</div>
                  <div className={`rounded-lg border p-2 ${form.acknowledgedSignature ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-muted-foreground'}`}>TTD<br />Mengetahui</div>
                  <div className={`rounded-lg border p-2 ${form.receivedSignature ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-muted-foreground'}`}>TTD<br />Menerima</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><strong>Catatan stok:</strong><br />Saat disimpan, stok pusat/TCP langsung berkurang dan stok toko/sistem bertambah. Barang dari toko ke pusat dicatat lewat retur/stok keluar.</div>
            <div className="space-y-2">
              {formStep > 1 && <Button variant="outline" className="w-full" onClick={() => setFormStep((step) => Math.max(1, step - 1))}>Kembali ke langkah sebelumnya</Button>}
              {formStep < 4 ? (
                <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => setFormStep((step) => Math.min(4, step + 1))} disabled={!canContinue}>
                  Lanjut ke {formSteps[formStep]?.title || 'Preview'}
                </Button>
              ) : (
                <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={submit} disabled={createLoan.isPending || !stepReady[4]}>{createLoan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Saya sudah cek, Simpan Pinjaman</Button>
              )}
              <Button variant="ghost" className="w-full" onClick={resetForm}>Reset Form</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-r from-orange-50 via-white to-slate-50 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">Inventaris</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pinjam Barang</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">Kelola peminjaman barang dari Pusat/TCP ke toko dengan tanda tangan digital dan form cetak. Pengiriman barang toko ke pusat masuk alur retur/stok keluar.</p>
          </div>
        </div>
      </div>

      {canCreate && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 text-sm font-bold text-orange-900">Pinjam Barang</div>
                <p className="text-sm text-orange-800">Dipakai saat toko/Admin Order meminjam barang dari Pusat/TCP. Form, TTD, dan pengembalian tetap tercatat.</p>
              </div>
              <Button size="lg" className="shrink-0 bg-orange-600 hover:bg-orange-700" onClick={() => setShowForm((v) => !v)}>
                {showForm ? <ChevronUp className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {showForm ? 'Tutup Form' : 'Buat Pinjaman'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 text-sm font-bold text-slate-900">Retur ke Pusat</div>
                <p className="text-sm text-muted-foreground">Dipakai saat barang dari toko dikirim/ditarik ke Pusat/TCP. Alur ini mengurangi stok sistem, bukan membuat form pinjaman.</p>
              </div>
              <Link href="/returns/new" className="shrink-0">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Buat Retur
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {canCreate && showForm && renderLoanForm()}

      {canCreate && (
        <div className="rounded-2xl border bg-card shadow-sm">
          <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => setShowCenterPanel((v) => !v)}>
            <div><h2 className="text-lg font-semibold">Set / Koreksi Stok Pusat TCP</h2><p className="text-sm text-muted-foreground">Isi saldo awal stok pusat agar sistem tahu stok pusat sebenarnya.</p></div>
            {showCenterPanel ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {showCenterPanel && <div className="grid gap-3 border-t p-4 md:grid-cols-5"><Select value={centerAdjust.productId || 'none'} onValueChange={(value) => setCenterAdjust({ ...centerAdjust, productId: value === 'none' ? '' : value, variantName: '' })}><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent><SelectItem value="none">Pilih produk</SelectItem>{products.map((product: Product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select><Select value={centerAdjust.variantName || 'none'} onValueChange={(value) => setCenterAdjust({ ...centerAdjust, variantName: value === 'none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Varian" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa varian</SelectItem>{(productMap.get(centerAdjust.productId)?.variants || productMap.get(centerAdjust.productId)?.variantItems || []).map((variant) => <SelectItem key={variant.id} value={variant.value}>{variant.value}</SelectItem>)}</SelectContent></Select><Select value={centerAdjust.type} onValueChange={(value: 'SET' | 'IN' | 'OUT') => setCenterAdjust({ ...centerAdjust, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SET">Set stok pusat</SelectItem><SelectItem value="IN">Tambah stok pusat</SelectItem><SelectItem value="OUT">Kurangi stok pusat</SelectItem></SelectContent></Select><Input type="number" min={0} value={centerAdjust.quantity} onChange={(e) => setCenterAdjust({ ...centerAdjust, quantity: Number(e.target.value) })} placeholder="Jumlah" /><Button disabled={!centerAdjust.productId || adjustCenter.isPending} onClick={() => adjustCenter.mutate({ ...centerAdjust, variantName: centerAdjust.variantName || null })}>Simpan Stok Pusat</Button></div>}
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-3"><Input placeholder="Cari no form / peminjam / tujuan" value={search} onChange={(e) => setSearch(e.target.value)} /><Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="BORROWED">Masih dipinjam</SelectItem><SelectItem value="RETURNED">Sudah kembali</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => { setSearch(''); setStatusFilter(''); }}>Reset filter</Button></div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table><TableHeader><TableRow><TableHead>No Form</TableHead><TableHead>Tanggal</TableHead><TableHead>Arah</TableHead><TableHead>Barang</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow> : loans.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Handshake className="mx-auto mb-2 h-10 w-10 opacity-40" />Belum ada data pinjam barang</TableCell></TableRow> : loans.map((loan) => <TableRow key={loan.id}><TableCell className="font-semibold">{loan.loanNumber}</TableCell><TableCell>{format(new Date(loan.loanDate), 'dd MMM yyyy')}</TableCell><TableCell>{directionLabel(loan.direction)}</TableCell><TableCell className="max-w-sm"><div className="space-y-1 text-sm">{(loan.items || []).map((item) => <div key={item.id}><span className="font-medium">{item.product?.name || '-'}</span>{item.variantName ? <span className="text-muted-foreground"> ({item.variantName})</span> : null}<span> • {item.quantity} unit</span><span className="text-muted-foreground"> • {conditionLabels[item.condition]}</span><span className="text-muted-foreground"> • stok: {stockText(item.product, item.variantName)}</span></div>)}</div></TableCell><TableCell>{loan.status === 'BORROWED' ? <Badge className="bg-amber-500 text-white">Masih dipinjam</Badge> : <Badge className="bg-green-600 text-white">Sudah kembali</Badge>}</TableCell><TableCell className="max-w-xs text-sm text-muted-foreground"><div>{loan.notes || '-'}</div><div className="mt-1 text-xs">Peminjam: {loan.borrowerName} → {loan.targetName}</div></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => printLoan(loan)} className="mb-2"><Printer className="mr-2 h-4 w-4" />Cetak</Button>{canCreate && loan.status === 'BORROWED' && <div className="flex min-w-56 flex-col gap-2"><Input placeholder="Catatan kembali" value={returnNotes[loan.id] || ''} onChange={(e) => setReturnNotes({ ...returnNotes, [loan.id]: e.target.value })} /><Button size="sm" variant="outline" onClick={() => returnLoan.mutate({ id: loan.id, returnNotes: returnNotes[loan.id] })} disabled={returnLoan.isPending}><RotateCcw className="mr-2 h-4 w-4" /> Tandai Kembali</Button></div>}</TableCell></TableRow>)}</TableBody></Table>
      </div>
    </div>
  );
}
