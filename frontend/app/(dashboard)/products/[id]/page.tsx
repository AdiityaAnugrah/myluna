'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '@/components/forms/ProductForm';
import { useProduct } from '@/lib/hooks/useProducts';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: productData, isLoading, error } = useProduct(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="text-muted-foreground">Memuat data produk...</p>
      </div>
    );
  }

  if (error || !productData?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/products')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Gagal Memuat Produk</AlertTitle>
          <AlertDescription>
            {error ? (error as any).message || 'Terjadi kesalahan saat mengambil data.' : 'Produk tidak ditemukan.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <ProductForm product={productData.data} isEdit={true} />
    </div>
  );
}
