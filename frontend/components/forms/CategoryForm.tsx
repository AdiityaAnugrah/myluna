'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { categorySchema, CategoryFormData } from '@/lib/validations/schemas';
import { useCreateCategory, useUpdateCategory, useCategories } from '@/lib/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Category } from '@/types';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryFormProps {
  category?: Category;
  isEdit?: boolean;
}

export function CategoryForm({ category, isEdit = false }: CategoryFormProps) {
  const router = useRouter();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];
  
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          parentId: category.parentId || undefined,
        }
      : {
          name: '',
          parentId: undefined,
        },
  });

  const parentId = watch('parentId');

  // Filter out self as parent to prevent circular reference
  const availableParents = useMemo(() => {
    return categories.filter((c: Category) => !isEdit || c.id !== category?.id);
  }, [categories, isEdit, category?.id]);

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


  const onSubmit = (data: CategoryFormData) => {
    const apiData = {
      ...data,
      parentId: data.parentId === "none" ? null : data.parentId
    };

    if (isEdit && category) {
      updateMutation.mutate(
        { id: category.id, data: apiData as any },
        {
          onSuccess: () => router.push('/categories'),
        }
      );
    } else {
      createMutation.mutate(apiData as any, {
        onSuccess: () => router.push('/categories'),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/categories" onClick={(e) => handleBack(e, '/categories')}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Kategori</CardTitle>
          <CardDescription>Atur nama dan struktur hierarki kategori.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kategori *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isPending}
                  placeholder="Elektronik, Perabotan, dll."
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Kategori Induk (Parent)</Label>
                <Select
                  value={parentId || "none"}
                  onValueChange={(val) => setValue('parentId', val === "none" ? null : val)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori induk (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kategori Utama (Tanpa Induk)</SelectItem>
                    {availableParents.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentId && (
                  <p className="text-sm text-red-500">{errors.parentId.message}</p>
                )}
              </div>
            </div>


            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEdit ? 'Menyimpan...' : 'Membuat...'}
                  </>
                ) : (
                  <>{isEdit ? 'Simpan Perubahan' : 'Buat Kategori'}</>
                )}
              </Button>
              <Link href="/categories" onClick={(e) => handleBack(e, '/categories')}>
                <Button type="button" variant="outline" disabled={isPending}>
                  Batal
                </Button>
              </Link>

            </div>
          </form>
        </CardContent>
      </Card>

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
