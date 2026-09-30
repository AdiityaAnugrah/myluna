'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { format } from 'date-fns';
import { Handshake, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProducts } from '@/lib/hooks/useProducts';
import {
  useCreateInventoryLoan,
  useAdjustCenterStock,
  useCenterStocks,
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
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
  }, []);

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
    <div className="space-y-2">
      <Label>{label}</Label>
      <canvas
        ref={canvasRef}
        width={420}
        height={140}
        className="h-32 w-full touch-none rounded-lg border bg-white shadow-inner"
        onPointerDown={(event) => {
          drawing.current = true;
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
        onPointerUp={() => {
          drawing.current = false;
          save();
        }}
        onPointerLeave={() => {
          drawing.current = false;
          save();
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onChange('');
          }
        }}
      >
        Bersihkan TTD
      </Button>
    </div>
  );
}

export default function InventoryLoansPage() {
  const { user } = useAuth();
  const canCreate = ['ADMIN_ORDER', 'ADMIN', 'SUPER_ADMIN', 'DEV'].includes(String(user?.role || '').toUpperCase());
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    direction: 'TO_CENTER' as 'TO_CENTER' | 'FROM_CENTER',
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
  const [items, setItems] = useState<FormItem[]>([
    { productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' },
  ]);
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [centerAdjust, setCenterAdjust] = useState({ productId: '', variantName: '', quantity: 0, type: 'SET' as 'SET' | 'IN' | 'OUT' });

  const { data, isLoading } = useInventoryLoans({
    page: 1,
    limit: 50,
    status: statusFilter || undefined,
    direction: directionFilter || undefined,
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

  const productMap = useMemo(() => {
    return new Map(products.map((product: Product) => [product.id, product]));
  }, [products]);

  const centerStockMap = useMemo(() => {
    const map = new Map<string, number>();
    centerStocks.forEach((row) => {
      map.set(`${row.productId}::${row.variantName || ''}`, Number(row.stock || 0));
    });
    return map;
  }, [centerStocks]);

  const resetForm = () => {
    setForm({
      direction: 'TO_CENTER',
      loanDate: today(),
      borrowerName: '',
      targetName: '',
      notes: '',
      submittedSignatureName: '',
      acknowledgedSignatureName: '',
      receivedSignatureName: '',
      submittedSignature: '',
      acknowledgedSignature: '',
      receivedSignature: '',
    });
    setItems([{ productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' }]);
  };

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
    setOpen(false);
    resetForm();
  };

  const directionLabel = (direction: string) =>
    direction === 'TO_CENTER' ? 'Stok kita → Pusat/TCP' : 'Pusat/TCP → Stok kita';

  const stockText = (product?: Product, variantName?: string | null) => {
    if (!product) return '-';
    const variant = (product.variants || product.variantItems || []).find((v) => v.value === variantName);
    const online = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    const center = centerStockMap.get(`${product.id}::${variantName || ''}`) || 0;
    return `Online ${online} • Pusat ${center}`;
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
      <div class="sig">
        <div>${title}</div>
        <div class="sigbox">${image ? `<img src="${image}" />` : ''}</div>
        <strong>${name || '&nbsp;'}</strong>
      </div>
    `;
    const html = `
      <html>
        <head>
          <title>${loan.loanNumber}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:32px;color:#111}
            h1{text-align:center;font-size:22px;margin:0 0 24px}
            .meta{width:100%;margin-bottom:18px}.meta td{padding:3px 6px}
            table.items{width:100%;border-collapse:collapse;margin:12px 0 18px}
            .items th,.items td{border:1px solid #111;padding:8px;font-size:13px}
            .note{border:1px solid #111;min-height:70px;padding:8px;margin:16px 0}
            .signatures{display:flex;justify-content:space-between;margin-top:28px;gap:24px}
            .sig{text-align:center;flex:1}.sigbox{height:90px;display:flex;align-items:center;justify-content:center}
            .sigbox img{max-height:80px;max-width:180px}
            @media print{button{display:none} body{padding:12px}}
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <h1>FORM PINJAMAN BARANG</h1>
          <table class="meta">
            <tr><td width="160">No Form</td><td>: ${loan.loanNumber}</td></tr>
            <tr><td>Tanggal</td><td>: ${format(new Date(loan.loanDate), 'dd MMMM yyyy')}</td></tr>
            <tr><td>Nama Peminjam</td><td>: ${loan.borrowerName}</td></tr>
            <tr><td>Ditujukan Pada</td><td>: ${loan.targetName}</td></tr>
            <tr><td>Arah</td><td>: ${directionLabel(loan.direction)}</td></tr>
          </table>
          <table class="items">
            <thead><tr><th>No</th><th>Nama Barang</th><th>Unit</th><th>Kondisi saat dipinjam</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="note"><strong>Catatan:</strong><br/>${loan.notes || '-'}</div>
          <div class="signatures">
            ${signature('Mengajukan', loan.submittedSignatureName, loan.submittedSignature)}
            ${signature('Mengetahui', loan.acknowledgedSignatureName, loan.acknowledgedSignature)}
            ${signature('Menerima', loan.receivedSignatureName, loan.receivedSignature)}
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-600">Pinjam Barang</h1>
          <p className="mt-1 text-muted-foreground">
            Form pinjaman barang antara stok kita dan pusat/TCP. Stok otomatis disesuaikan saat dipinjam dan saat kembali.
          </p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="mr-2 h-4 w-4" /> Buat Pinjaman
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Form Pinjaman Barang</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Arah Pinjaman</Label>
                  <Select value={form.direction} onValueChange={(v: 'TO_CENTER' | 'FROM_CENTER') => setForm({ ...form, direction: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TO_CENTER">Stok kita dipinjam Pusat/TCP</SelectItem>
                      <SelectItem value="FROM_CENTER">Stok kita meminjam dari Pusat/TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={form.loanDate} onChange={(e) => setForm({ ...form, loanDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nama Peminjam</Label>
                  <Input value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} placeholder="Contoh: Lokal Jateng / TCP Pusat" />
                </div>
                <div className="space-y-2">
                  <Label>Ditujukan Pada</Label>
                  <Input value={form.targetName} onChange={(e) => setForm({ ...form, targetName: e.target.value })} placeholder="Contoh: Divisi Online / Pusat" />
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Daftar Barang</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItems([...items, { productId: '', variantName: '', quantity: 1, condition: 'GOOD', notes: '' }])}
                  >
                    Tambah baris
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const selectedProduct = productMap.get(item.productId);
                    const variants = selectedProduct?.variants || selectedProduct?.variantItems || [];
                    return (
                      <div key={index} className="grid gap-2 rounded-lg bg-muted/40 p-3 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <Label className="text-xs">Produk</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => {
                              const next = [...items];
                              next[index] = { ...item, productId: value, variantName: '' };
                              setItems(next);
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                            <SelectContent>
                              {products.map((product: Product) => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Varian</Label>
                          <Select
                            value={item.variantName || 'none'}
                            onValueChange={(value) => {
                              const next = [...items];
                              next[index] = { ...item, variantName: value === 'none' ? '' : value };
                              setItems(next);
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa varian</SelectItem>
                              {variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.value}>{variant.value} • stok {variant.stock}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...items];
                              next[index] = { ...item, quantity: Number(e.target.value) };
                              setItems(next);
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Kondisi</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value: InventoryLoanItemCondition) => {
                              const next = [...items];
                              next[index] = { ...item, condition: value };
                              setItems(next);
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(conditionLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Catatan barang</Label>
                          <Input
                            value={item.notes}
                            onChange={(e) => {
                              const next = [...items];
                              next[index] = { ...item, notes: e.target.value };
                              setItems(next);
                            }}
                            placeholder="Opsional"
                          />
                        </div>
                        <div className="flex items-end md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setItems(items.filter((_, i) => i !== index))}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mengajukan</Label>
                  <Input value={form.submittedSignatureName} onChange={(e) => setForm({ ...form, submittedSignatureName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Mengetahui</Label>
                  <Input value={form.acknowledgedSignatureName} onChange={(e) => setForm({ ...form, acknowledgedSignatureName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Menerima</Label>
                  <Input value={form.receivedSignatureName} onChange={(e) => setForm({ ...form, receivedSignatureName: e.target.value })} />
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="mb-3">
                  <h3 className="font-semibold">Tanda Tangan Digital</h3>
                  <p className="text-sm text-muted-foreground">Coret langsung di area putih. TTD akan ikut muncul saat form dicetak.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <SignaturePad
                    label="TTD Mengajukan"
                    value={form.submittedSignature}
                    onChange={(value) => setForm({ ...form, submittedSignature: value })}
                  />
                  <SignaturePad
                    label="TTD Mengetahui"
                    value={form.acknowledgedSignature}
                    onChange={(value) => setForm({ ...form, acknowledgedSignature: value })}
                  />
                  <SignaturePad
                    label="TTD Menerima"
                    value={form.receivedSignature}
                    onChange={(value) => setForm({ ...form, receivedSignature: value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contoh: Diminta untuk diretur ke pusat" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={submit} disabled={createLoan.isPending}>
                  {createLoan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Form Pinjam Barang
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <Input placeholder="Cari no form / peminjam / tujuan" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={directionFilter || 'all'} onValueChange={(v) => setDirectionFilter(v === 'all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Arah" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua arah</SelectItem>
            <SelectItem value="TO_CENTER">Stok kita → Pusat/TCP</SelectItem>
            <SelectItem value="FROM_CENTER">Pusat/TCP → Stok kita</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="BORROWED">Masih dipinjam</SelectItem>
            <SelectItem value="RETURNED">Sudah kembali</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setSearch(''); setDirectionFilter(''); setStatusFilter(''); }}>Reset filter</Button>
      </div>

      {canCreate && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Set / Koreksi Stok Pusat TCP</h2>
            <p className="text-sm text-muted-foreground">Dipakai untuk mengisi saldo awal stok pusat agar sistem tahu stok pusat sebenarnya.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <Select value={centerAdjust.productId || 'none'} onValueChange={(value) => setCenterAdjust({ ...centerAdjust, productId: value === 'none' ? '' : value, variantName: '' })}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pilih produk</SelectItem>
                {products.map((product: Product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={centerAdjust.variantName || 'none'} onValueChange={(value) => setCenterAdjust({ ...centerAdjust, variantName: value === 'none' ? '' : value })}>
              <SelectTrigger><SelectValue placeholder="Varian" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa varian</SelectItem>
                {(productMap.get(centerAdjust.productId)?.variants || productMap.get(centerAdjust.productId)?.variantItems || []).map((variant) => (
                  <SelectItem key={variant.id} value={variant.value}>{variant.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={centerAdjust.type} onValueChange={(value: 'SET' | 'IN' | 'OUT') => setCenterAdjust({ ...centerAdjust, type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SET">Set stok pusat</SelectItem>
                <SelectItem value="IN">Tambah stok pusat</SelectItem>
                <SelectItem value="OUT">Kurangi stok pusat</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min={0} value={centerAdjust.quantity} onChange={(e) => setCenterAdjust({ ...centerAdjust, quantity: Number(e.target.value) })} placeholder="Jumlah" />
            <Button
              disabled={!centerAdjust.productId || adjustCenter.isPending}
              onClick={() => adjustCenter.mutate({ ...centerAdjust, variantName: centerAdjust.variantName || null })}
            >
              Simpan Stok Pusat
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No Form</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Arah</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Handshake className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  Belum ada data pinjam barang
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-semibold">{loan.loanNumber}</TableCell>
                  <TableCell>{format(new Date(loan.loanDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{directionLabel(loan.direction)}</TableCell>
                  <TableCell className="max-w-sm">
                    <div className="space-y-1 text-sm">
                      {(loan.items || []).map((item) => (
                        <div key={item.id}>
                          <span className="font-medium">{item.product?.name || '-'}</span>
                          {item.variantName ? <span className="text-muted-foreground"> ({item.variantName})</span> : null}
                          <span> • {item.quantity} unit</span>
                          <span className="text-muted-foreground"> • {conditionLabels[item.condition]}</span>
                          <span className="text-muted-foreground"> • stok: {stockText(item.product, item.variantName)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {loan.status === 'BORROWED' ? (
                      <Badge className="bg-amber-500 text-white">Masih dipinjam</Badge>
                    ) : (
                      <Badge className="bg-green-600 text-white">Sudah kembali</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    <div>{loan.notes || '-'}</div>
                    <div className="mt-1 text-xs">Peminjam: {loan.borrowerName} → {loan.targetName}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => printLoan(loan)} className="mb-2">
                      Cetak Form
                    </Button>
                    {canCreate && loan.status === 'BORROWED' && (
                      <div className="flex min-w-56 flex-col gap-2">
                        <Input
                          placeholder="Catatan kembali"
                          value={returnNotes[loan.id] || ''}
                          onChange={(e) => setReturnNotes({ ...returnNotes, [loan.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => returnLoan.mutate({ id: loan.id, returnNotes: returnNotes[loan.id] })}
                          disabled={returnLoan.isPending}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Tandai Kembali
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
