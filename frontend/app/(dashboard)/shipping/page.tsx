'use strict';
'use client';

import { useState } from 'react';
import { useShippingServices, useCreateShippingService, useUpdateShippingService, useDeleteShippingService } from '@/lib/hooks/useShipping';
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
import { Truck, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';


export default function ShippingPage() {
  const { data: services, isLoading } = useShippingServices();
  const createMutation = useCreateShippingService();
  const updateMutation = useUpdateShippingService();
  const deleteMutation = useDeleteShippingService();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);


  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [name, setName] = useState('');

  const handleOpen = (service?: any) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
    } else {
      setEditingService(null);
      setName('');
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingService(null);
    setName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Nama jasa pengiriman tidak boleh kosong');
      return;
    }

    if (editingService) {
      updateMutation.mutate(
        { id: editingService.id, data: { name } },
        { onSuccess: handleClose }
      );
    } else {
      createMutation.mutate(
        { name },
        { onSuccess: handleClose }
      );
    }
  };

  const toggleStatus = (service: any) => {
    updateMutation.mutate({
      id: service.id,
      data: { isActive: !service.isActive },
    });
  };

  const handleDelete = (id: string) => {
    setServiceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteMutation.mutate(serviceToDelete);
      setServiceToDelete(null);
    }
  };


  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="animate-in">
          <Breadcrumbs items={[{ label: 'Jasa Pengiriman' }]} />
          <h1 className="text-3xl font-bold mt-2 tracking-tight text-gradient">Jasa Pengiriman</h1>
          <p className="text-muted-foreground mt-1">Kelola daftar ekspedisi dan kurir pengiriman.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Jasa Pengiriman
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Jasa Pengiriman' : 'Tambah Jasa Pengiriman'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Jasa Pengiriman</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Contoh: CENTRAL CARGO"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Gunakan huruf kapital (otomatis).
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
          <CardTitle className="text-xl">Daftar Jasa Pengiriman</CardTitle>
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
                  <TableHead>Nama Jasa Pengiriman</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Belum ada jasa pengiriman.
                    </TableCell>
                  </TableRow>
                ) : (
                  services?.data?.map((service: any) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {service.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={() => toggleStatus(service)}
                          />
                          <span className="text-sm">
                            {service.isActive ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpen(service)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleDelete(service.id)}
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
        title="Hapus Jasa Pengiriman"
        description="Apakah Anda yakin ingin menghapus jasa pengiriman ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        variant="destructive"
      />
    </div>

  );
}
