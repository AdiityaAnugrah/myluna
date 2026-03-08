import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../api/stock';
import { changeRequestsApi } from '../api/requests';
import { toast } from 'sonner';
import { PaginationParams } from '@/types';

export function useStockMovements(params?: PaginationParams & { productId?: string; type?: string }) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockApi.getMovements(params),
  });
}

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; type: 'IN' | 'OUT'; notes?: string }) =>
      stockApi.createAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      toast.success('Penyesuaian stok berhasil disimpan');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menyimpan penyesuaian stok';
      toast.error(message);
    },
  });
}

/** For USER role: submit a stock adjustment request that needs admin approval */
export function useCreateStockRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; type: 'IN' | 'OUT'; notes?: string }) =>
      changeRequestsApi.createStockRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      toast.success('Pengajuan penyesuaian stok berhasil dikirim dan menunggu persetujuan Admin');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal mengajukan penyesuaian stok';
      toast.error(message);
    },
  });
}
