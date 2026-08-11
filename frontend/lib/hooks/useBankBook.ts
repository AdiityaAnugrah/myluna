import { useQuery } from '@tanstack/react-query';
import { bankBookApi } from '@/lib/api/bankBook';

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
