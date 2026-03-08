import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api/products';
import { toast } from 'sonner';
import { Category } from '@/types';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Category>) => categoryApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Kategori berhasil dibuat');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat kategori';
      toast.error(message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryApi.update(id, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Kategori berhasil diperbarui');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui kategori';
      toast.error(message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan penghapusan dikirim untuk persetujuan admin');
      } else {
        toast.success('Kategori berhasil dihapus');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal menghapus kategori';
      toast.error(message);
    },
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => categoryApi.getById(id),
    enabled: !!id,
  });
}
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });
}
