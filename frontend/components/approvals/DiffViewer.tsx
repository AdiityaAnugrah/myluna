'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DiffViewerProps {
  oldData?: any;
  newData: any;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK';
}

// Mapping field names ke Bahasa Indonesia
const fieldNameMap: Record<string, string> = {
  // Product fields
  name: 'Nama Produk',
  sku: 'Kode SKU',
  description: 'Deskripsi',
  categoryId: 'ID Kategori',
  unit: 'Satuan',
  purchasePrice: 'Harga Beli',
  sellingPrice: 'Harga Jual',
  stock: 'Stok',
  minStock: 'Stok Minimum',
  isActive: 'Status Aktif',
  imageUrl: 'URL Gambar',
  length: 'Panjang',
  width: 'Lebar',
  height: 'Tinggi',
  weight: 'Berat',
  variants: 'Varian',
  warrantyPrice: 'Harga Garansi',
  currentPrices: 'Harga Saat Ini',
  reason: 'Alasan',
  
  // Category fields
  parentId: 'Kategori Induk',
  slug: 'Slug',
  
  // Supplier fields
  address: 'Alamat',
  phone: 'Telepon',
  email: 'Email',
  contactPerson: 'Kontak Person',
  
  // Stock fields
  productId: 'ID Produk',
  quantity: 'Jumlah',
  type: 'Tipe',
  reference: 'Referensi',
  notes: 'Catatan',
  
  // Common fields
  createdAt: 'Dibuat Pada',
  updatedAt: 'Diperbarui Pada',
  createdBy: 'Dibuat Oleh',
  updatedBy: 'Diperbarui Oleh',
};

// Robustly parse payload that might be double-encoded as a string
const parsePayload = (payload: any): any => {
  if (typeof payload !== 'string') return payload;
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed === 'string') return parsePayload(parsed);
    return parsed;
  } catch (e) {
    return payload;
  }
};

export function DiffViewer({ oldData, newData: rawNewData, type }: DiffViewerProps) {
  const newData = parsePayload(rawNewData);
  
  const getFieldLabel = (key: string): string => {
    return fieldNameMap[key] || key;
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null) return <span className="text-gray-400 italic">-</span>;
    if (value === undefined) return <span className="text-gray-400 italic">-</span>;
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? 'Ya' : 'Tidak'}
        </Badge>
      );
    }
    if (typeof value === 'number') {
      return <span className="text-blue-600 font-semibold">{value.toLocaleString('id-ID')}</span>;
    }
    
    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-50 p-3 rounded border max-h-60 overflow-auto whitespace-pre-wrap break-words">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    // Format currency for price fields
    if (typeof value === 'string' || typeof value === 'number') {
      const strValue = String(value);
      // Check if it's a UUID (skip formatting)
      if (strValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return <span className="text-xs text-gray-500 font-mono break-all">{strValue}</span>;
      }
    }
    
    return <span className="break-words">{String(value)}</span>;
  };

  // Check if newData is an array
  if (Array.isArray(newData)) {
    return (
      <Card className="border-green-200 bg-green-50/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-green-700">
            📝 Data Baru ({newData.length} item)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <pre className="text-sm bg-white p-4 rounded border max-h-96 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  if (type === 'CREATE' || type === 'STOCK') {
    const entries = Object.entries(newData).filter(([key]) => 
      !['id', 'deletedAt', 'createdBy', 'updatedBy'].includes(key)
    );

    return (
      <Card className="border-green-200 bg-green-50/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-green-700">
            📝 Data Baru
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1 text-sm border-b border-green-100 pb-3 last:border-0">
                <span className="font-semibold text-gray-700 text-sm">
                  {getFieldLabel(key)}
                </span>
                <div className="pl-3 text-gray-900">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'DELETE') {
     return (
      <Card className="border-red-200 bg-red-50/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-red-700">
            🗑️ Permintaan Penghapusan
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
           <p className="text-sm text-gray-600">
             Permintaan ini untuk menghapus data. 
             Pastikan data yang akan dihapus tidak lagi diperlukan.
           </p>
        </CardContent>
      </Card>
    );
  }

  // UPDATE
  if (newData?.__requestKind === 'PRICE_UPDATE') {
    const currentPrices = newData.currentPrices || {};
    const rows = [
      ['Harga Beli', currentPrices.purchasePrice, newData.purchasePrice],
      ['Harga Jual', currentPrices.sellingPrice, newData.sellingPrice],
      ['Harga Garansi', currentPrices.warrantyPrice, newData.warrantyPrice],
    ];

    const formatCurrency = (value: any) => {
      if (value === null || value === undefined || value === '') return '-';
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(Number(value) || 0);
    };

    return (
      <Card className="border-emerald-200 bg-emerald-50/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-emerald-700">
            💰 Pengajuan Perubahan Harga
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-right">Harga Lama</th>
                  <th className="px-3 py-2 text-right">Harga Baru</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, before, after]) => (
                  <tr key={String(label)} className="border-t">
                    <td className="px-3 py-2 font-medium">{label}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(before)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatCurrency(after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {newData.reason && (
            <div className="rounded-lg border bg-white p-3 text-sm">
              <div className="font-semibold text-gray-700 mb-1">Alasan</div>
              <div className="text-gray-900">{String(newData.reason)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(newData).filter(([key]) => 
    !['id', 'deletedAt', 'createdBy', 'updatedBy', 'createdAt', '__requestKind'].includes(key)
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="border-blue-200 bg-blue-50/10">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-blue-700">
            ✏️ Perubahan Data
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1 text-sm border-b border-blue-100 pb-3 last:border-0">
                <span className="font-semibold text-gray-700 text-sm">
                  {getFieldLabel(key)}
                </span>
                <div className="pl-3 text-gray-900">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


