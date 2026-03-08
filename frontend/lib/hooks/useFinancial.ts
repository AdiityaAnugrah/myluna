import { useQuery } from '@tanstack/react-query';
import { financialApi } from '../api/financial';

export const useFinancialSummary = (
  params?: { startDate?: string; endDate?: string },
  options?: any
) => {
  return useQuery({
    queryKey: ['financial-summary', params],
    queryFn: () => financialApi.getSummary(params),
    ...options,
  });
};
