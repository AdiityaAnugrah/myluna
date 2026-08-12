import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bankBookApi } from '@/lib/api/bankBook';
import { toast } from 'sonner';

export const useBankBookCandidates = (
  params?: {
    page?: number;
    limit?: number;
    source?: 'ALL' | 'SETTLEMENT' | 'REQUEST';
    platform?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: any
) => {
  return useQuery({
    queryKey: ['bank-book-candidates', params],
    queryFn: () => bankBookApi.getCandidates(params),
    ...options,
  });
};

export const useBankBookEntries = (params?: { page?: number; limit?: number }, options?: any) => {
  return useQuery({
    queryKey: ['bank-book-entries', params],
    queryFn: () => bankBookApi.getEntries(params),
    ...options,
  });
};

export const useCreateBankBookEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bankBookApi.createEntry,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bank-book-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['bank-book-entries'] });
      toast.success(response?.message || 'Rekonsiliasi Buku Bank berhasil disimpan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan rekonsiliasi Buku Bank');
    },
  });
};
