'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateSale } from '@/lib/hooks/useSales';
import { useAuthStore } from '@/lib/stores/auth';
import { useEffect } from 'react';
import { useProducts } from '@/lib/hooks/useProducts';
import { usePlatforms } from '@/lib/hooks/usePlatforms';
import { useShippingServices } from '@/lib/hooks/useShipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';




import { ProductSelector } from '@/components/sales/ProductSelector';
import { BulkProductSelector } from '@/components/sales/BulkProductSelector';
import { formatCurrency, getVariants } from '@/lib/utils/sales';
import { getTodayDateInputValue, getUserTodayDateInputProps } from '@/lib/utils/dateGuard';
import {
  RegionAddressFields,
  ShippingAddressValue,
} from '@/components/sales/RegionAddressFields';

interface SaleItem {
  productId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  priceType: 'regular' | 'warranty';
}

export default function NewSalePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createMutation = useCreateSale();
  const { data: productsData } = useProducts({ limit: 100 }, { enabled: user?.role !== 'TCP' });
  const { data: platformsData, isLoading: platformsLoading } = usePlatforms({ enabled: user?.role !== 'TCP' });
  const { data: shippingServices, isLoading: shippingLoading } = useShippingServices({ enabled: user?.role !== 'TCP' });

  const products = productsData?.data?.products || [];
  const isUser = user?.role === 'USER';

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('TRANSFER');
  const [platform, setPlatform] = useState<string>('');

  // Auto-select first active platform if none is selected or current doesn't exist
  useEffect(() => {
    if (platformsData?.data) {
      const activePlatforms = platformsData.data.filter((p: any) => p.isActive);
      if (activePlatforms.length > 0) {
        setPlatform(prev => {
          if (!prev || !activePlatforms.some((p: any) => p.name === prev)) {
            return activePlatforms[0].name;
          }
          return prev;
        });
      }
    }
  }, [platformsData]);
  
  if (user?.role === 'TCP') {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border shadow-lg max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">Akses Ditolak</h3>
                    <p className="text-muted-foreground mt-2">
                        Kamu tidak mempunyai akses ke fitur itu.
                    </p>
                </div>
                <Button onClick={() => router.push('/')} variant="default" className="w-full">
                    Kembali ke Dashboard
                </Button>
            </div>
        </div>
    );
  }
  const [saleDate, setSaleDate] = useState(() => getTodayDateInputValue());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);

  const [shippingService, setShippingService] = useState<string>('');
  
  const isDocumentRequired = useMemo(() => {
    if (!shippingService || !shippingServices?.data) return false;
    const service = shippingServices.data.find((s: any) => s.name === shippingService);
    return service?.requiresDocument || false;
  }, [shippingService, shippingServices]);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddressValue>({
    addressDetail: '',
    provinceId: '',
    regencyId: '',
    districtId: '',
    villageId: '',
    postalCode: '',
  });
  const [shippingDocument, setShippingDocument] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formStartTime = useRef<number>(Date.now()); // track how long form was open

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Define before isFormValid (const not hoisted — must be declared before use)
  const getProductStock = (productId: string, variantName?: string | null) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    if (variantName) {
      let variantsArray = product.variants;
      if (typeof variantsArray === 'string') {
        try { variantsArray = JSON.parse(variantsArray); } catch { variantsArray = []; }
      }
      if (Array.isArray(variantsArray)) {
        const variant = variantsArray.find((v: any) => {
          const rawLabel = typeof v === 'string' ? v : (v.value || (v.name ? `${v.name}: ${v.value}` : ''));
          return String(rawLabel) === String(variantName);
        });
        if (variant && typeof variant === 'object' && variant.stock !== undefined) {
          return Number(variant.stock);
        }
      }
    }
    return Number(product.stock) || 0;
  };

  const hasCompleteShippingAddress = Boolean(
    shippingAddress.addressDetail.trim()
    && shippingAddress.provinceId
    && shippingAddress.regencyId
    && shippingAddress.districtId
    && shippingAddress.villageId
  );

  const isFormValid = invoiceNumber.trim() !== ''
    && shippingService !== ''
    && hasCompleteShippingAddress
    && items.length > 0
    && items.every((item) => {
    if (!item.productId) return false;
    if (item.quantity <= 0) return false;
    if (item.price < 0) return false;
    
    // Check if variant is required but missing
    const product = products.find(p => p.id === item.productId);
    const variants = getVariants(product?.variants);
    if (variants.length > 0 && !item.variantName) {
      return false;
    }
    // Validate against correct stock (variant or main)
    const stock = getProductStock(item.productId, item.variantName);
    if (item.quantity > stock) return false;
    return true;
  });

  const isDirty = invoiceNumber !== ''
    || customerName !== ''
    || customerPhone !== ''
    || items.length > 0
    || notes !== ''
    || shippingAddress.addressDetail !== ''
    || shippingAddress.provinceId !== '';
  useConfirmPageLeave(isDirty, () => {
    setNextPath(null);
    setLeaveConfirmOpen(true);
  });

  const cancelLeave = () => {
    if (isDirty && !nextPath) {
      window.history.pushState(null, '', window.location.pathname);
    }
    setNextPath(null);
    setLeaveConfirmOpen(false);
  };

  const handleBack = (e: React.MouseEvent, href: string) => {
    if (isDirty) {
      e.preventDefault();
      setNextPath(href);
      setLeaveConfirmOpen(true);
    }
  };

  const confirmLeave = () => {
    if (nextPath) {
      router.push(nextPath);
    } else {
      router.back();
    }
  };

  const handleBulkSelect = (selectedItems: { productId: string; quantity: number }[]) => {
    const newItems = [...items];

    selectedItems.forEach(selection => {
        const product = products.find(p => p.id === selection.productId);
        const price = product ? parseFloat(product.sellingPrice) : 0;
        
        let hasVariants = false;
        if (product) {
            let vars = product.variants;
            if (typeof vars === 'string') {
              try { vars = JSON.parse(vars); } catch { vars = []; }
            }
            if (Array.isArray(vars) && vars.length > 0) hasVariants = true;
        }
        
        // Find existing index. Only merge if the product has NO variants.
        // If it has variants, we always create a new row so the user can select different variants.
        const existingIndex = newItems.findIndex(i => i.productId === selection.productId);
        
        if (existingIndex >= 0 && !hasVariants) {
            newItems[existingIndex].quantity += selection.quantity;
        } else {
            newItems.push({
                productId: selection.productId,
                variantName: null,
                quantity: selection.quantity,
                price: price,
                priceType: 'regular',
            });
        }
    });

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Fixed updateItem to accept multiple field updates at once to prevent stale state closures
  const updateItemFields = (index: number, updates: Partial<SaleItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Auto-fill selling price when product is selected
    if ('productId' in updates && updates.productId) {
      const product = products.find((p) => p.id === updates.productId);
      if (product) {
        newItems[index].price = parseFloat(product.sellingPrice);
        newItems[index].priceType = 'regular';
      }
    }
    
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
      updateItemFields(index, { [field]: value });
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Hanya file PDF yang diperbolehkan');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setShippingDocument(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber || invoiceNumber.trim() === '') {
      toast.error('Nomor Invoice wajib diisi');
      return;
    }

    if (items.length === 0) {
      toast.error('Mohon tambahkan setidaknya satu barang');
      return;
    }

    const invalidItems = items.filter(
      (item) => !item.productId || item.quantity <= 0 || item.price <= 0
    );
    if (invalidItems.length > 0) {
      toast.error('Mohon isi semua data barang dengan benar');
      return;
    }

    // Stock validation (per-variant aware)
    const outOfStockItems = items.filter((item) => {
      const stock = getProductStock(item.productId, item.variantName);
      return item.quantity > stock;
    });

    if (outOfStockItems.length > 0) {
      toast.error('Beberapa barang memiliki stok tidak mencukupi. Mohon periksa jumlah pesanan.');
      return;
    }
    
    // Shipping validation
    if (!shippingService) {
        toast.error('Mohon pilih Jasa Pengiriman');
        return;
    }

    if (!hasCompleteShippingAddress) {
        toast.error('Mohon lengkapi wilayah dan detail alamat pengiriman');
        return;
    }

    if (isDocumentRequired && !shippingDocument) {
        toast.error(`Mohon unggah dokumen PDF untuk ${shippingService}`);
        return;
    }

    const formData = new FormData();
    formData.append('invoiceNumber', invoiceNumber);
    if (customerName) formData.append('customerName', customerName);
    if (customerPhone) formData.append('customerPhone', customerPhone);
    formData.append('paymentMethod', paymentMethod);
    formData.append('platform', platform);
    formData.append('saleDate', isUser ? getTodayDateInputValue() : saleDate);
    if (!isDocumentRequired && notes) formData.append('notes', notes);
    
    formData.append('items', JSON.stringify(items.map((item) => ({
      productId: item.productId,
      variantName: item.variantName || null,
      quantity: item.quantity,
      price: item.price.toString(),
      discount: '0',
    }))));

    if (shippingService) {
        formData.append('shippingService', shippingService);
        formData.append('shippingAddressDetail', shippingAddress.addressDetail.trim());
        formData.append('shippingProvinceId', shippingAddress.provinceId);
        formData.append('shippingRegencyId', shippingAddress.regencyId);
        formData.append('shippingDistrictId', shippingAddress.districtId);
        formData.append('shippingVillageId', shippingAddress.villageId);
        if (isDocumentRequired && shippingDocument) {
            formData.append('shippingDocument', shippingDocument);
        }
    }

    // Track duration (seconds from page open to submit)
    const durationSeconds = Math.round((Date.now() - formStartTime.current) / 1000);
    formData.append('duration', String(durationSeconds));

    createMutation.mutate(formData, {
        onSuccess: () => router.push('/sales'),
    });
  };

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'Penjualan', href: '/sales' }, { label: 'Penjualan Baru' }]}
      />
      <div className="flex items-center gap-4">
        <Link href="/sales" onClick={(e) => handleBack(e, '/sales')}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Penjualan Baru</h1>
          <p className="text-gray-600 mt-1">Buat transaksi penjualan baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Nomor Invoice <span className="text-red-500">*</span></Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={isPending}
                placeholder="Contoh: INV-2024-001"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nama Pelanggan</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isPending}
                  placeholder="Pelanggan Umum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telepon Pelanggan</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCustomerPhone(value);
                  }}
                  disabled={isPending}
                  placeholder="08xxxxxxxxxx"
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode Pembayaran *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="CASH">Tunai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate">Tanggal Penjualan *</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={isUser ? getTodayDateInputValue() : saleDate}
                  onChange={(e) => {
                    if (!isUser) setSaleDate(e.target.value);
                  }}
                  disabled={isPending}
                  {...getUserTodayDateInputProps(isUser)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  value={platform}
                  onValueChange={(value: any) => setPlatform(value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platformsLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : platformsData?.data?.filter((p: any) => p.isActive).map((p: any) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Shipping Section */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Pengiriman</h3>
                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="shippingService">Jasa Pengiriman</Label>
                    <Select
                      value={shippingService}
                      onValueChange={(value) => {
                          setShippingService(value);
                          // We need to use the value here to find if it requires document, 
                          // because isDocumentRequired will only update on next render
                          const selectedService = shippingServices?.data?.find((s: any) => s.name === value);
                          if (selectedService?.requiresDocument) {
                              setNotes('');
                          } else {
                              setShippingDocument(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                          }
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jasa Pengiriman" />
                      </SelectTrigger>
                      <SelectContent>
                        {shippingLoading ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : shippingServices?.data?.length === 0 ? (
                           <div className="p-2 text-sm text-gray-500 text-center">
                             Belum ada jasa pengiriman
                           </div>
                        ) : (
                          shippingServices?.data?.filter((s: any) => s.isActive).map((s: any) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <RegionAddressFields
                  value={shippingAddress}
                  onChange={setShippingAddress}
                  disabled={isPending}
                />

                {isDocumentRequired ? (
                    <div className="space-y-2">
                        <Label htmlFor="shippingDocument">Upload Dokumen (PDF, Max 2MB) *</Label>
                        <Input
                            id="shippingDocument"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            disabled={isPending}
                            ref={fileInputRef}
                        />
                        <p className="text-sm text-gray-500">
                            Wajib upload untuk {shippingService}. Catatan dinonaktifkan.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="notes">Catatan</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isPending}
                            rows={3}
                        />
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Barang</CardTitle>
            <BulkProductSelector 
                onSelect={handleBulkSelect} 
                disabled={isPending}
                trigger={
                    <Button type="button" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Barang
                    </Button>
                }
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-32">Varian</TableHead>
                  <TableHead className="w-24">Stok</TableHead>
                  <TableHead className="w-32">Jumlah</TableHead>
                  <TableHead className="w-40">Harga</TableHead>
                  <TableHead className="w-40 text-right">Subtotal</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Belum ada barang ditambahkan. Klik "Tambah Barang" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const stock = getProductStock(item.productId, item.variantName);
                    const isOutOfStock = item.quantity > stock;
                    const subtotal = item.quantity * item.price;

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <ProductSelector
                            selectedProductId={item.productId}
                            onSelect={(value) => {
                                updateItemFields(index, { productId: value, variantName: null });
                            }}
                            disabled={isPending}
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const product = products.find(p => p.id === item.productId);
                            let variantsArray = product?.variants;
                            if (typeof variantsArray === 'string') {
                              try { variantsArray = JSON.parse(variantsArray); } catch (e) { variantsArray = []; }
                            }
                            const hasVariants = variantsArray && Array.isArray(variantsArray) && variantsArray.length > 0;
                            if (!hasVariants) {
                                return <span className="text-gray-400 text-sm">-</span>;
                            }
                            return (
                                <Select
                                  value={item.variantName || ''}
                                  onValueChange={(val) => updateItem(index, 'variantName', val)}
                                  disabled={isPending}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Pilih Varian" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variantsArray?.map((v: any, i: number) => {
                                      // Show just the color value (e.g. "PUTIH") as the label
                                      const variantLabelRaw = typeof v === 'string' ? v : (v.value || v.name || 'Unknown');
                                      const variantLabel = String(variantLabelRaw);
                                      const stockNum = typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : undefined;
                                      const stockText = stockNum !== undefined ? ` (Stok: ${stockNum})` : '';
                                      
                                      // Check if this variant is already selected in another row
                                      const isAlreadySelected = items.some((otherItem, otherIndex) => 
                                          otherIndex !== index && 
                                          otherItem.productId === item.productId && 
                                          otherItem.variantName === variantLabel
                                      );
                                      
                                      const isOutOfStock = stockNum !== undefined && stockNum <= 0;
                                      const isDisabled = isOutOfStock || isAlreadySelected;
                                      
                                      return (
                                        <SelectItem 
                                          key={`${variantLabel}-${i}`} 
                                          value={variantLabel}
                                          disabled={isDisabled}
                                          className={isDisabled ? "opacity-50" : ""}
                                        >
                                          {variantLabel}{stockText}{isAlreadySelected ? ' (Sudah Dipilih)' : ''}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className={stock <= 0 ? 'text-red-600 font-semibold' : ''}>
                            {stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={stock}
                            step="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value) && value > 0) {
                                updateItem(index, 'quantity', value);
                              } else if (e.target.value === '') {
                                updateItem(index, 'quantity', 1);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e') {
                                e.preventDefault();
                              }
                            }}
                            disabled={isPending}
                            className={isOutOfStock ? 'border-red-500' : ''}
                          />
                          {isOutOfStock && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stok tidak cukup
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const product = products.find(p => p.id === item.productId);
                            const hasWarrantyPrice = product?.warrantyPrice && parseFloat(product.warrantyPrice) > 0;
                            if (!hasWarrantyPrice) {
                              // No warranty price — just show price as read-only
                              return (
                                <Input
                                  type="number"
                                  value={item.price}
                                  readOnly
                                  disabled={isPending}
                                  className="bg-muted cursor-not-allowed"
                                />
                              );
                            }
                            // Has warranty price — show toggle buttons
                            return (
                              <div className="space-y-1">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...items];
                                      newItems[index].priceType = 'regular';
                                      newItems[index].price = parseFloat(product!.sellingPrice);
                                      setItems(newItems);
                                    }}
                                    disabled={isPending}
                                    className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${
                                      item.priceType !== 'warranty'
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                    }`}
                                  >
                                    Tanpa Garansi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...items];
                                      newItems[index].priceType = 'warranty';
                                      newItems[index].price = parseFloat(product!.warrantyPrice!);
                                      setItems(newItems);
                                    }}
                                    disabled={isPending}
                                    className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${
                                      item.priceType === 'warranty'
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                    }`}
                                  >
                                    Pakai Garansi
                                  </button>
                                </div>
                                <Input
                                  type="number"
                                  value={item.price}
                                  readOnly
                                  disabled={isPending}
                                  className="bg-muted cursor-not-allowed"
                                />
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Jumlah</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending || !isFormValid}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Membuat Penjualan...
              </>
            ) : (
              'Buat Penjualan'
            )}
          </Button>
          <Link href="/sales" onClick={(e) => handleBack(e, '/sales')}>
            <Button type="button" variant="outline" disabled={isPending}>
              Batal
            </Button>
          </Link>
        </div>
      </form>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        title="Tinggalkan Halaman?"
        description="Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?"
        confirmText="Tinggalkan"
        cancelText="Tetap di Sini"
        variant="destructive"
      />
    </div>
  );
}
