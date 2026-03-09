import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { otherIncomeApi } from '../api/otherIncome';
import { toast } from 'sonner';

export const useOtherIncomes = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}, options?: any) => {
  return useQuery({
    queryKey: ['other-incomes', params],
    queryFn: () => otherIncomeApi.getAll(params),
    ...options,
  });
};

export const useCreateOtherIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => otherIncomeApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      toast.success('Pendapatan lain-lain berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan pendapatan');
    },
  });
};

export const useUpdateOtherIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      otherIncomeApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      toast.success('Pendapatan lain-lain berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui pendapatan');
    },
  });
};

export const useDeleteOtherIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: otherIncomeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      toast.success('Pendapatan lain-lain berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus pendapatan');
    },
  });
};
