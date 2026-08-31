'use strict';
'use client';

import { useState } from 'react';
import { usePlatforms, useCreatePlatform, useUpdatePlatform, useDeletePlatform } from '@/lib/hooks/usePlatforms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormFieldError, FormValidationSummary, errorInputClass } from '@/components/forms/FormValidationFeedback';
import { cn } from '@/lib/utils';


export default function PlatformsPage() {
  const { data: platforms, isLoading } = usePlatforms();
  const createMutation = useCreatePlatform();
  const updateMutation = useUpdatePlatform();
  const deleteMutation = useDeletePlatform();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null);


  const [isOpen, setIsOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [name, setName] = useState('');
  const [feePercentage, setFeePercentage] = useState('25');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleOpen = (platform?: any) => {
    if (platform) {
      setEditingPlatform(platform);
      setName(platform.name);
      setFeePercentage(String(platform.feePercentage ?? 25));
    } else {
      setEditingPlatform(null);
      setName('');
      setFeePercentage('25');
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingPlatform(null);
    setName('');
    setFeePercentage('25');
    setSubmitAttempted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    if (!name.trim()) {
      toast.error('Nama platform tidak boleh kosong');
      return;
    }
    const normalizedFeePercentage = Number(feePercentage);
    if (!Number.isFinite(normalizedFeePercentage) || normalizedFeePercentage < 0 || normalizedFeePercentage > 100) {
      toast.error('Persentase biaya harus di antara 0 sampai 100');
      return;
    }

    if (editingPlatform) {
      updateMutation.mutate(
        { id: editingPlatform.id, data: { name, feePercentage: normalizedFeePercentage } },
        { onSuccess: handleClose }
      );
    } else {
      createMutation.mutate(
        { name, feePercentage: normalizedFeePercentage },
        { onSuccess: handleClose }
      );
    }
  };

  const toggleStatus = (platform: any) => {
    updateMutation.mutate({
      id: platform.id,
      data: { isActive: !platform.isActive },
    });
  };

  const handleDelete = (id: string) => {
    setPlatformToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (platformToDelete) {
      deleteMutation.mutate(platformToDelete);
      setPlatformToDelete(null);
    }
  };


  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="animate-in">
          <Breadcrumbs items={[{ label: 'Platform' }]} />
          <h1 className="text-3xl font-bold mt-2 tracking-tight text-gradient">Platform Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola channel penjualan Marketplace atau Toko Fisik.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Platform
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlatform ? 'Edit Platform' : 'Tambah Platform'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormValidationSummary
                show={submitAttempted && (!name.trim() || !Number.isFinite(Number(feePercentage)) || Number(feePercentage) < 0 || Number(feePercentage) > 100)}
                fields={[
                  ...(!name.trim() ? ['Nama Platform'] : []),
                  ...(!Number.isFinite(Number(feePercentage)) || Number(feePercentage) < 0 || Number(feePercentage) > 100 ? ['Biaya Platform'] : []),
                ]}
              />
              <div className="space-y-2">
                <Label htmlFor="name">Nama Platform</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Contoh: TOKOPEDIA"
                  disabled={isPending}
                  aria-invalid={submitAttempted && !name.trim() ? true : undefined}
                  className={cn(submitAttempted && !name.trim() && errorInputClass)}
                />
                <FormFieldError message={submitAttempted && !name.trim() ? 'Nama platform wajib diisi.' : undefined} />
                <p className="text-xs text-muted-foreground">
                  Gunakan huruf kapital (otomatis).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feePercentage">Biaya Platform (%)</Label>
                <Input
                  id="feePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={feePercentage}
                  onChange={(e) => setFeePercentage(e.target.value)}
                  placeholder="25"
                  disabled={isPending}
                  aria-invalid={submitAttempted && (!Number.isFinite(Number(feePercentage)) || Number(feePercentage) < 0 || Number(feePercentage) > 100) ? true : undefined}
                  className={cn(submitAttempted && (!Number.isFinite(Number(feePercentage)) || Number(feePercentage) < 0 || Number(feePercentage) > 100) && errorInputClass)}
                />
                <FormFieldError message={submitAttempted && (!Number.isFinite(Number(feePercentage)) || Number(feePercentage) < 0 || Number(feePercentage) > 100) ? 'Biaya platform harus angka 0 sampai 100.' : undefined} />
                <p className="text-xs text-muted-foreground">
                  Dipakai Buku Biaya. Jika penjualan 150.000 dan biaya 25%, kredit biaya menjadi 37.500.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="animate-in [animation-delay:100ms] border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">Platform Aktif</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
            </div>
          ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Platform</TableHead>
                  <TableHead>Biaya Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada platform.
                    </TableCell>
                  </TableRow>
                ) : (
                  platforms?.data?.map((platform: any) => (
                    <TableRow key={platform.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          {platform.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold tabular-nums">{Number(platform.feePercentage ?? 25).toLocaleString('id-ID')}%</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={platform.isActive}
                            onCheckedChange={() => toggleStatus(platform)}
                          />
                          <span className="text-sm">
                            {platform.isActive ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpen(platform)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleDelete(platform.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Platform"
        description="Apakah Anda yakin ingin menghapus platform ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />
    </div>

  );
}
