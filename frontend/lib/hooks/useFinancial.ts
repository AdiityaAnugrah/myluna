import { useQuery } from '@tanstack/react-query';
import { financialApi } from '../api/financial';

export const useFinancialSummary = (
  params?: { startDate?: string; endDate?: string; page?: number; limit?: number; bookMode?: 'sales' | 'cost' },
  options?: any
) => {
  return useQuery({
    queryKey: ['financial-summary', params],
    queryFn: () => financialApi.getSummary(params),
    ...options,
  });
};
export interface OmsetBreakdownResponse {
  success: boolean;
  message: string;
  data: {
    monthly: { month: number; year: number; total: number }[];
    yearly: { year: number; total: number }[];
    grandTotal: number;
  };
}

export const useOmsetBreakdown = (options?: any) => {
  return useQuery<OmsetBreakdownResponse>({
    queryKey: ['omset-breakdown'],
    queryFn: () => financialApi.getOmsetBreakdown(),
    ...options,
  });
};
