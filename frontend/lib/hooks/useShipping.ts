import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingApi, ShippingService } from '../api/shipping';
import { toast } from 'sonner';

export function useShippingServices(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['shipping-services'],
    queryFn: shippingApi.getAll,
    ...options,
  });
}

export function useCreateShippingService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shippingApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-services'] });
      toast.success('Jasa pengiriman berhasil dibuat');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat jasa pengiriman';
      toast.error(message);
    },
  });
}

export function useUpdateShippingService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShippingService> }) => 
      shippingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-services'] });
      toast.success('Jasa pengiriman berhasil diperbarui');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui jasa pengiriman';
      toast.error(message);
    },
  });
}

export function useDeleteShippingService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shippingApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-services'] });
      toast.success('Jasa pengiriman berhasil dihapus');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menghapus jasa pengiriman';
      toast.error(message);
    },
  });
}
