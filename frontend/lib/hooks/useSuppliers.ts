import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierApi } from '../api/suppliers';
import { toast } from 'sonner';
import { Supplier, PaginationParams } from '@/types';

export function useSuppliers(params?: PaginationParams & { search?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => supplierApi.getAll(params),
    ...options,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => supplierApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Supplier>) => supplierApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Supplier berhasil dibuat');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat supplier';
      toast.error(message);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      supplierApi.update(id, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Supplier berhasil diperbarui');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui supplier';
      toast.error(message);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierApi.delete(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan penghapusan dikirim untuk persetujuan admin');
      } else {
        toast.success('Supplier berhasil dihapus');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menghapus supplier';
      toast.error(message);
    },
  });
}
