'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { supplierSchema, SupplierFormData } from '@/lib/validations/schemas';
import { useCreateSupplier, useUpdateSupplier } from '@/lib/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Supplier } from '@/types';
import { useConfirmPageLeave } from '@/lib/hooks/useConfirmPageLeave';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';


interface SupplierFormProps {
  supplier?: Supplier;
  isEdit?: boolean;
}

export function SupplierForm({ supplier, isEdit = false }: SupplierFormProps) {
  const router = useRouter();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);


  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contact: supplier.contact,
          phone: supplier.phone,
          email: supplier.email || '',
          address: supplier.address || '',
        }
      : undefined,
  });

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


  const onSubmit = (data: SupplierFormData) => {
    if (isEdit && supplier) {
      updateMutation.mutate(
        { id: supplier.id, data },
        {
          onSuccess: () => router.push('/suppliers'),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => router.push('/suppliers'),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/suppliers" onClick={(e) => handleBack(e, '/suppliers')}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Edit Supplier' : 'Tambah Supplier'}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Supplier *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isPending}
                  placeholder="PT. Nama Supplier"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Kontak Person *</Label>
                <Input
                  id="contact"
                  {...register('contact')}
                  disabled={isPending}
                  placeholder="Budi Santoso"
                />
                {errors.contact && (
                  <p className="text-sm text-red-500">{errors.contact.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telepon *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  disabled={isPending}
                  placeholder="+62 812 3456 7890"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isPending}
                  placeholder="supplier@contoh.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                {...register('address')}
                disabled={isPending}
                placeholder="Alamat lengkap supplier"
                rows={4}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEdit ? 'Menyimpan...' : 'Membuat...'}
                  </>
                ) : (
                  <>{isEdit ? 'Simpan Perubahan' : 'Buat Supplier'}</>
                )}
              </Button>
              <Link href="/suppliers" onClick={(e) => handleBack(e, '/suppliers')}>
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
