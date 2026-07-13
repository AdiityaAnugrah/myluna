'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import Link from 'next/link';
import { Loader2, ArrowLeft, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

// Hardcoded VARIANT_COLOR_OPTIONS removed - now fetched from API
import { toast } from 'sonner';

import { productSchema, ProductFormData } from '@/lib/validations/schemas';
import { useCreateProduct, useUpdateProduct } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import { apiClient } from '@/lib/api/client';
import { useVariantOptions, useCreateVariantOption, VariantOption } from '@/lib/hooks/useVariantOptions';
import { useFormTimer } from '@/lib/hooks/useFormTimer';
import { Product, Category } from '@/types';
import { cn } from '@/lib/utils';
import { stripHtml } from '@/lib/utils/html';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PreviewableImage } from '@/components/ui/previewable-image';
import { Separator } from '@/components/ui/separator';

interface ProductFormProps {
  product?: Product;
  isEdit?: boolean;
}

export function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Hooks
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { getDurationSeconds } = useFormTimer();

  // Variant options logic
  const { data: variantOptionsData } = useVariantOptions();
  const variantOptions = (variantOptionsData?.data || []) as VariantOption[];
  const createVariantOption = useCreateVariantOption();
  const [newColorInput, setNewColorInput] = useState<string>('');
  const [isAddingNewColor, setIsAddingNewColor] = useState<boolean>(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);

  // Initialize Default Values with Defensive Checks
  const defaultValues: Partial<ProductFormData> = product
    ? {
        sku: product.sku || '',
        name: product.name || '',
        description: stripHtml(product.description || ''),
        categoryId: product.categoryId || '',
        imageUrl: product.imageUrl || '',
        // Handle number conversions safely
        length: product.length ? Number(product.length) : 0,
        width: product.width ? Number(product.width) : 0,
        height: product.height ? Number(product.height) : 0,
        weight: product.weight ? Number(product.weight) : 0,
        unit: product.unit || '',
        purchasePrice: product.purchasePrice ? Number(product.purchasePrice) : 0,
        sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : 0,
        warrantyPrice: product.warrantyPrice ? Number(product.warrantyPrice) : null,
        stock: product.stock ? Number(product.stock) : 0,
        minStock: product.minStock ? Number(product.minStock) : 0,
        // Handle variants array safely
        variants: (product.variants && Array.isArray(product.variants))
          ? product.variants.map((v: any) => ({
              id: v.id || undefined, // Keep ID for updates
              name: v.name || '',
              value: v.value || '',
              stock: v.stock ? Number(v.stock) : 0,
              priceAdjustment: v.priceAdjustment ? Number(v.priceAdjustment) : 0,
            }))
          : [],
        isActive: product.isActive ?? true,
      }
    : {
        name: '',
        sku: '',
        description: '',
        categoryId: '',
        imageUrl: '',
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        unit: '',
        purchasePrice: 0,
        sellingPrice: 0,
        warrantyPrice: null,
        stock: 0,
        minStock: 0,
        variants: [],
        isActive: true,
      };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any, // Cast to any to resolve strict type mismatch
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  const categoryId = watch('categoryId');

  // --- SAFE CATEGORY LOGIC (No useEffect Loop) ---

  // 1. Get Main Categories (Top Level)
  const mainCategories = useMemo(() =>
    categories.filter((c: Category) => !c.parentId),
    [categories]
  );

  // 2. Derive Initial Main Category from Product Data
  const getInitialMainCat = () => {
    if (!product?.categoryId) return "";
    const current = categories.find((c: Category) => c.id === product.categoryId);
    return current?.parentId || current?.id || "";
  };

  const [mainCat, setMainCat] = useState<string>(getInitialMainCat());

  // 3. Derived Subcategories based on selected MainCat
  const subCategories = useMemo(() => {
    if (!mainCat) return [];
    return categories.filter((c: Category) => c.parentId === mainCat);
  }, [categories, mainCat]);

  // Handle Main Category Change
  const handleMainCategoryChange = (val: string) => {
    setMainCat(val);

    // Auto-select validation logic:
    setValue('categoryId', val, { shouldValidate: true });
  };

  // Update local state if product data loads later (rare case if SSR)
  useEffect(() => {
      if (product?.categoryId && categories.length > 0 && !mainCat) {
          const current = categories.find((c: Category) => c.id === product.categoryId);
          const parentId = current?.parentId || current?.id || "";
          if (parentId) setMainCat(parentId);
      }
  }, [product, categories, mainCat]);


  // Submit Handler
  const onSubmit = (data: ProductFormData) => {
    try {
      // Ensure strict type conversion before sending to API
      const apiData: any = {
        ...data,
        length: Number(data.length || 0),
        width: Number(data.width || 0),
        height: Number(data.height || 0),
        weight: Number(data.weight || 0),
        purchasePrice: Number(data.purchasePrice || 0),
        sellingPrice: Number(data.sellingPrice || 0),
        warrantyPrice: data.warrantyPrice !== undefined && data.warrantyPrice !== null && !isNaN(Number(data.warrantyPrice)) && Number(data.warrantyPrice) > 0
          ? Number(data.warrantyPrice)
          : null,
      stock: isEdit ? Number(product?.stock ?? 0) : 0,
        minStock: Number(data.minStock || 0),
        duration: getDurationSeconds(),
        variants: data.variants?.map((v: any) => ({
          ...v,
          // Auto-set name to value (color) if user didn't enter one
          name: v.name || v.value || '',
          // Force variant stock to 0 for new products
          stock: isEdit ? Number(v.stock || 0) : 0,
          priceAdjustment: Number(v.priceAdjustment || 0),
        })) || []
      };

      console.log("Submitting Cleaned Data:", apiData);

      if (isEdit && product) {
        updateMutation.mutate(
          { id: product.id, data: apiData },
          {
            onSuccess: () => {
              const message = isAdmin
                ? "Produk berhasil diperbarui"
                : "Permintaan pembaruan produk berhasil dikirim dan menunggu persetujuan";
              toast.success(message);
              router.push('/products');
            },
            onError: (err: any) => {
              console.error("Update Error:", err);
              toast.error(err?.response?.data?.message || "Gagal memperbarui produk");
            }
          }
        );
      } else {
        createMutation.mutate(apiData, {
          onSuccess: () => {
              const message = isAdmin
                ? "Produk berhasil dibuat"
                : "Produk berhasil diajukan dan menunggu persetujuan Admin";
              toast.success(message);
              router.push('/products');
          },
          onError: (err: any) => {
              console.error("Create Error:", err);
              toast.error(err?.response?.data?.message || "Gagal membuat produk");
            }
        });
      }
    } catch (err) {
      console.error("Form Submission Error:", err);
      toast.error("Terjadi kesalahan pada data formulir");
    }
  };

  const handleAddNewColor = async () => {
    if (!newColorInput.trim()) return;

    createVariantOption.mutate(newColorInput.trim().toUpperCase(), {
      onSuccess: (response) => {
        if (activeVariantIndex !== null) {
          setValue(`variants.${activeVariantIndex}.value`, response.data.name);
        }
        setNewColorInput('');
        setIsAddingNewColor(false);
        setActiveVariantIndex(null);
      }
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || createVariantOption.isPending;

  // Mode hanya berlaku saat tambah produk baru (bukan edit)
  // REMOVED: mode selector - new products always start at stock 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" type="button" onClick={() => router.push('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Edit Produk' : 'Tambah Produk'}
          </h1>
        </div>
      </div>


      <form onSubmit={handleSubmit(onSubmit, (formErrors) => {
        console.error('Validation errors:', formErrors);
        const firstError = Object.values(formErrors)[0] as any;
        const message = firstError?.message || 'Mohon periksa kembali isian form';
        toast.error(message);
      })} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Column (left 2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informasi Dasar */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Dasar</CardTitle>
                <CardDescription>Detail utama produk Anda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk *</Label>
                  <Input id="name" {...register('name')} disabled={isPending} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Kategori Utama *</Label>
                    <Select value={mainCat} onValueChange={handleMainCategoryChange} disabled={isPending}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCategories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Kategori</Label>
                    <Select
                      value={categoryId === mainCat ? "" : categoryId}
                      onValueChange={(val) => setValue('categoryId', val)}
                      disabled={isPending || !mainCat || subCategories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={subCategories.length === 0 ? "Tidak ada sub-kategori" : "Pilih sub kategori"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimensi & Berat */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensi &amp; Berat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Dimensi (cm) — Panjang × Lebar × Tinggi</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <Input type="number" placeholder="Panjang" {...register('length', { valueAsNumber: true })} disabled={isPending} className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">cm</span>
                    </div>
                    <div className="relative">
                      <Input type="number" placeholder="Lebar" {...register('width', { valueAsNumber: true })} disabled={isPending} className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">cm</span>
                    </div>
                    <div className="relative">
                      <Input type="number" placeholder="Tinggi" {...register('height', { valueAsNumber: true })} disabled={isPending} className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">cm</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Berat</Label>
                  <div className="relative">
                    <Input type="number" step="0.01" placeholder="0.00" {...register('weight', { valueAsNumber: true })} disabled={isPending} className="pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Harga & Stok */}
            <Card>
              <CardHeader>
                <CardTitle>Harga &amp; Stok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Satuan *</Label>
                    <Input {...register('unit')} placeholder="pcs" disabled={isPending} />
                    {errors.unit && <p className="text-sm text-red-500">{errors.unit.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Beli</Label>
                    <Input type="number" {...register('purchasePrice', { valueAsNumber: true })} disabled={isPending} placeholder="0" />
                    {errors.purchasePrice && <p className="text-sm text-red-500">{errors.purchasePrice.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Jual (Tanpa Garansi) *</Label>
                    <Input type="number" {...register('sellingPrice', { valueAsNumber: true })} disabled={isPending} />
                    {errors.sellingPrice && <p className="text-sm text-red-500">{errors.sellingPrice.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Pakai Garansi <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
                    <Input
                      type="number"
                      placeholder="Kosongkan jika tidak ada garansi"
                      {...register('warrantyPrice', {
                        setValueAs: (v) => (v === '' || v === null || v === undefined) ? null : Number(v),
                      })}
                      disabled={isPending}
                    />
                    {errors.warrantyPrice && <p className="text-sm text-red-500">{errors.warrantyPrice.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Min Stok *</Label>
                  <Input type="number" {...register('minStock', { valueAsNumber: true })} disabled={isPending} />
                  {errors.minStock && <p className="text-sm text-red-500">{errors.minStock.message}</p>}
                </div>
                {(!fields || fields.length === 0) && (
                  <>
                    {!isEdit && (
                      <div className="rounded-lg border p-3 bg-muted text-sm text-muted-foreground">
                        Stok awal otomatis dimulai dari <strong>0</strong>. Gunakan <strong>Penyesuaian Stok</strong> di halaman Stok Keseluruhan untuk mengisi stok awal.
                      </div>
                    )}
                    {isEdit && (
                      <div className="space-y-2">
                        <Label>Stok Saat Ini</Label>
                        <Input
                          type="number"
                          {...register('stock', { valueAsNumber: true })}
                          readOnly
                          className="bg-muted pointer-events-none"
                        />
                        <p className="text-xs text-muted-foreground">Gunakan menu Stok untuk mengubah stok.</p>
                      </div>
                    )}
                  </>
                )}
                {fields && fields.length > 0 && (
                  <div className="rounded-lg border p-3 bg-muted text-sm text-muted-foreground">
                    Stok dikelola per varian di bawah.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Varian Produk */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Varian Produk</CardTitle>
                    <CardDescription>Tambahkan variasi seperti warna atau ukuran.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', value: '', priceAdjustment: 0, stock: 0 })}
                    disabled={isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Varian
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Belum ada varian.
                  </div>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end border p-4 rounded-lg relative">
                    <div className="space-y-2">
                      <Label>Pilihan Warna / Varian *</Label>
                      <Controller
                        control={control}
                        name={`variants.${index}.value` as const}
                        render={({ field: f }) => {
                          // Combine fetched options with current value if it's missing
                          const displayOptions = [...variantOptions];
                          if (f.value && !variantOptions.some(opt => opt.name === f.value)) {
                            displayOptions.push({ id: `existing-${f.value}`, name: f.value });
                          }

                          return (
                            <Select
                              value={f.value}
                              onValueChange={(val) => {
                                if (val === 'ADD_NEW') {
                                  setActiveVariantIndex(index);
                                  setIsAddingNewColor(true);
                                } else {
                                  f.onChange(val);
                                }
                              }}
                              disabled={isPending}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih warna..." />
                              </SelectTrigger>
                              <SelectContent>
                                {displayOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.name}>
                                    {option.name.toUpperCase()}
                                  </SelectItem>
                                ))}
                                <Separator className="my-2" />
                                <SelectItem value="ADD_NEW" className="text-blue-600 font-medium">
                                  <Plus className="h-4 w-4 mr-2 inline" />
                                  + Tambah Warna Baru
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-2 flex-1">
                        <Label>Stok {!isEdit && <span className="text-xs text-muted-foreground">(otomatis 0)</span>}</Label>
                        <Input
                          type="number"
                          {...register(`variants.${index}.stock` as const, { valueAsNumber: true })}
                          disabled={isPending}
                          readOnly={isEdit}
                          className={isEdit ? "bg-muted" : ""}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(index)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pb-8">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEdit
                  ? (isAdmin ? 'Simpan Produk' : 'Ajukan Perubahan')
                  : (isAdmin ? 'Buat Produk' : 'Ajukan Produk Baru')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/products')}
                disabled={isPending}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>

          {/* ── Right Column (image only) ── */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gambar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {watch('imageUrl') ? (
                    <div className="h-full w-full" onClick={(event) => event.stopPropagation()}>
                      <PreviewableImage src={watch('imageUrl')} alt="Preview" className="h-full w-full border-0" />
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="mt-2 text-xs text-muted-foreground">Klik untuk unggah gambar</p>
                    </div>
                  )}
                </div>
                <Input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  disabled={isPending}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('image', file);
                    try {
                      const { data: response } = await apiClient.post('/upload/image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setValue('imageUrl', response.data.imageUrl, { shouldDirty: true });
                      toast.success('Gambar berhasil diunggah');
                    } catch (err: any) {
                      toast.error('Gagal mengunggah gambar');
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Dialog / Modal simple for new color */}
      {isAddingNewColor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tambah Warna Baru</CardTitle>
              <CardDescription>Masukkan nama warna atau varian baru.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-color">Nama Warna</Label>
                <Input
                  id="new-color"
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  placeholder="Contoh: UNGU, HIJAU DAUN, dll"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewColor();
                  }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNewColor(false);
                    setActiveVariantIndex(null);
                    setNewColorInput('');
                  }}
                  disabled={createVariantOption.isPending}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddNewColor}
                  disabled={createVariantOption.isPending || !newColorInput.trim()}
                >
                  {createVariantOption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tambah
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

