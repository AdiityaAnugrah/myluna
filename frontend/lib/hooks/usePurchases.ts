import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../api/purchases';
import { toast } from 'sonner';
import { PaginationParams } from '@/types';

export function usePurchases(
  params?: PaginationParams & { status?: string; startDate?: string; endDate?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: () => purchasesApi.getAll(params),
    ...options,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchasesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => purchasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Purchase created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create purchase';
      toast.error(message);
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchasesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Purchase updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update purchase';
      toast.error(message);
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete purchase';
      toast.error(message);
    },
  });
}
