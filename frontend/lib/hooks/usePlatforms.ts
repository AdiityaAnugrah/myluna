import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformsApi, Platform } from '../api/platforms';
import { toast } from 'sonner';

export function usePlatforms(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: platformsApi.getAll,
    ...options,
  });
}

export function useCreatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      toast.success('Platform berhasil dibuat');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat platform';
      toast.error(message);
    },
  });
}

export function useUpdatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Platform> }) => 
      platformsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      toast.success('Platform berhasil diperbarui');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui platform';
      toast.error(message);
    },
  });
}

export function useDeletePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      toast.success('Platform berhasil dihapus');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menghapus platform';
      toast.error(message);
    },
  });
}
