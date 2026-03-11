import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

export interface VariantOption {
  id: string;
  name: string;
}

export const variantOptionApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/variant-options');
    return data;
  },
  create: async (name: string) => {
    const { data } = await apiClient.post('/variant-options', { name });
    return data;
  },
};

export function useVariantOptions() {
  return useQuery({
    queryKey: ['variant-options'],
    queryFn: () => variantOptionApi.getAll(),
  });
}

export function useCreateVariantOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => variantOptionApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-options'] });
      toast.success('Pilihan warna berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menambahkan pilihan warna');
    },
  });
}
