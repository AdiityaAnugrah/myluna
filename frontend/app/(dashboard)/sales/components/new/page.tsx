'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth';
import { useCreateSale, useNextComponentInvoice } from '@/lib/hooks/useSales';
import { usePlatforms } from '@/lib/hooks/usePlatforms';
import { useShippingServices } from '@/lib/hooks/useShipping';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';
import { RegionAddressFields, ShippingAddressValue } from '@/components/sales/RegionAddressFields';

interface ComponentItem {
  componentName: string;
  componentNotes: string;
  quantity: number;
  price: number;
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number.isFinite(num) ? num : 0);
}

export default function NewComponentSalePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isUser = user?.role === 'USER';
  const createSale = useCreateSale();
  const { data: platformsData } = usePlatforms({ enabled: user?.role !== 'TCP' });
  const { data: shippingServices } = useShippingServices({ enabled: user?.role !== 'TCP' });
  const [saleDate, setSaleDate] = useState(getTodayDateInputValue());
  const nextInvoice = useNextComponentInvoice(isUser ? getTodayDateInputValue() : saleDate);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('TRANSFER');
  const [platform, setPlatform] = useState('MANUAL');
  const [shippingService, setShippingService] = useState('');
  const [notes, setNotes] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [items, setItems] = useState<ComponentItem[]>([{ componentName: '', componentNotes: '', quantity: 1, price: 0 }]);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressValue>({ addressDetail: '', provinceId: '', regencyId: '', districtId: '', villageId: '', postalCode: '' });
  const formStartTime = useRef(Date.now());

  useEffect(() => {
    if (platformsData?.data) {
      const manual = platformsData.data.find((p: any) => p.isActive && /manual|offline|toko/i.test(p.name));
      const first = platformsData.data.find((p: any) => p.isActive);
      setPlatform((prev) => prev || manual?.name || first?.name || 'MANUAL');
    }
  }, [platformsData]);

  const hasCompleteShippingAddress = Boolean(
    shippingAddress.addressDetail.trim()
    && shippingAddress.provinceId
    && shippingAddress.regencyId
    && shippingAddress.districtId
    && shippingAddress.villageId
  );

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0), [items]);
  const isFormValid = shippingService && hasCompleteShippingAddress && items.every((item) => item.componentName.trim() && item.quantity > 0 && item.price > 0);

  const updateItem = (index: number, updates: Partial<ComponentItem>) => {
    setItems((rows) => rows.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const addItem = () => setItems((rows) => [...rows, { componentName: '', componentNotes: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => setItems((rows) => rows.length === 1 ? rows : rows.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Lengkapi data komponen dan pengiriman terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('saleType', 'COMPONENT');
    formData.append('saleDate', isUser ? getTodayDateInputValue() : saleDate);
    if (nextInvoice.data?.data?.saleNumber) formData.append('invoiceNumber', nextInvoice.data.data.saleNumber);
    if (customerName) formData.append('customerName', customerName);
    if (customerPhone) formData.append('customerPhone', customerPhone);
    formData.append('paymentMethod', paymentMethod);
    formData.append('platform', platform || 'MANUAL');
    formData.append('shippingService', shippingService);
    formData.append('shippingAddressDetail', shippingAddress.addressDetail.trim());
    formData.append('shippingProvinceId', shippingAddress.provinceId);
    formData.append('shippingRegencyId', shippingAddress.regencyId);
    formData.append('shippingDistrictId', shippingAddress.districtId);
    formData.append('shippingVillageId', shippingAddress.villageId);
    const mergedNotes = [externalReference ? `Referensi: ${externalReference}` : '', notes].filter(Boolean).join('\n');
    if (mergedNotes) formData.append('notes', mergedNotes);
    formData.append('items', JSON.stringify(items.map((item) => ({
      itemType: 'COMPONENT',
      componentName: item.componentName.trim(),
      componentNotes: item.componentNotes || null,
      quantity: Number(item.quantity),
      price: String(Number(item.price)),
      discount: '0',
    }))));
    formData.append('duration', String(Math.round((Date.now() - formStartTime.current) / 1000)));

    createSale.mutate(formData, { onSuccess: () => router.push('/sales/process') });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan', href: '/sales' }, { label: 'Penjualan Komponen' }]} />
      <div className="flex items-center gap-4">
        <Link href="/sales"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Penjualan Komponen</h1>
          <p className="text-muted-foreground mt-1">Transaksi manual non-stok yang tetap masuk TCP dan keuangan.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informasi Penjualan</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nomor Invoice Sistem</Label>
              <Input value={nextInvoice.data?.data?.saleNumber || 'Generate otomatis saat simpan'} readOnly className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Penjualan</Label>
              <Input type="date" value={isUser ? getTodayDateInputValue() : saleDate} onChange={(e) => !isUser && setSaleDate(e.target.value)} {...getUserTodayDateInputProps(isUser)} />
            </div>
            <div className="space-y-2">
              <Label>Nama Customer</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama customer" />
            </div>
            <div className="space-y-2">
              <Label>No HP</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08..." />
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TRANSFER">Transfer</SelectItem><SelectItem value="CASH">Cash</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Channel/Platform</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue placeholder="Pilih channel" /></SelectTrigger><SelectContent>{platformsData?.data?.filter((p: any) => p.isActive).map((p: any) => <SelectItem key={p.id || p.name} value={p.name}>{p.name}</SelectItem>)}<SelectItem value="MANUAL">MANUAL</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Referensi/Catatan External</Label>
              <Input value={externalReference} onChange={(e) => setExternalReference(e.target.value)} placeholder="Contoh: Request WA customer / order manual" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Komponen Dijual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader><TableRow><TableHead>Nama Komponen</TableHead><TableHead>Spesifikasi/Catatan</TableHead><TableHead className="w-28 text-right">Qty</TableHead><TableHead className="w-40 text-right">Harga</TableHead><TableHead className="w-40 text-right">Subtotal</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
              <TableBody>
                {items.map((item, index) => <TableRow key={index}>
                  <TableCell><Input value={item.componentName} onChange={(e) => updateItem(index, { componentName: e.target.value })} placeholder="Kaca lemari" /></TableCell>
                  <TableCell><Input value={item.componentNotes} onChange={(e) => updateItem(index, { componentNotes: e.target.value })} placeholder="Ukuran/warna/catatan" /></TableCell>
                  <TableCell><Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="text-right" /></TableCell>
                  <TableCell><Input type="number" min={0} value={item.price} onChange={(e) => updateItem(index, { price: Number(e.target.value) })} className="text-right" /></TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.quantity * item.price)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={addItem}><Plus className="mr-2 h-4 w-4" />Tambah Komponen</Button>
              <div className="text-right"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pengiriman</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Jasa Pengiriman</Label>
              <Select value={shippingService} onValueChange={setShippingService}><SelectTrigger><SelectValue placeholder="Pilih jasa pengiriman" /></SelectTrigger><SelectContent>{shippingServices?.data?.filter((s: any) => s.isActive).map((s: any) => <SelectItem key={s.id || s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <RegionAddressFields value={shippingAddress} onChange={setShippingAddress} />
            <div className="space-y-2"><Label>Catatan Internal</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan untuk TCP/finance" /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/sales"><Button type="button" variant="outline">Batal</Button></Link>
          <Button type="submit" disabled={createSale.isPending || !isFormValid}>{createSale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat Penjualan Komponen</Button>
        </div>
      </form>
    </div>
  );
}
