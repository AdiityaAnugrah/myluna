import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales';
import { toast } from 'sonner';
import { PaginationParams } from '@/types';

export function useSales(params?: PaginationParams & {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  platform?: string;
  paymentMethod?: string;
  responsibleUserId?: string;
  settlementStatus?: string;
  cancelStatus?: string;
  minTotalAmount?: string;
  maxTotalAmount?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => salesApi.getAll(params),
    ...options,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.getById(id),
    enabled: !!id,
  });
}

export function useSalesStats() {
  return useQuery({
    queryKey: ['sales', 'stats'],
    queryFn: () => salesApi.getStats(),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => salesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Penjualan berhasil dibuat');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat penjualan';
      toast.error(message);
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Penjualan berhasil diperbarui');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui penjualan';
      toast.error(message);
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Penjualan berhasil dihapus');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menghapus penjualan';
      toast.error(message);
    },
  });
}

export function useApproveSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Penjualan berhasil disetujui');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menyetujui penjualan';
      toast.error(message);
    },
  });
}

export function useRejectSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Penjualan berhasil ditolak');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menolak penjualan';
      toast.error(message);
    },
  });
}

export function useProcessSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesApi.process(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      // toast.success('Penjualan diproses'); // Toast handled in component for better UX with print
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memproses penjualan';
      toast.error(message);
    },
  });
}
export function useRequestCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.requestCancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] }); // Also refresh settlements list
      toast.success('Pengajuan pembatalan penjualan berhasil dikirim');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal mengajukan pembatalan penjualan';
      toast.error(message);
    },
  });
}
