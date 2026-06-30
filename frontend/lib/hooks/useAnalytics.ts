import { useQuery } from '@tanstack/react-query';
import { analyticsApi, SalesAnalyticsParams } from '@/lib/api/analytics';

export function useOperationalAnalytics(
  params?: Partial<SalesAnalyticsParams>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['analytics', 'operations', params],
    queryFn: () => analyticsApi.getOperations(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSalesAnalytics(
  params: SalesAnalyticsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['analytics', 'sales', params],
    queryFn: () => analyticsApi.getSales(params),
    enabled: options?.enabled ?? true,
  });
}

export function useUnmappedSalesDiagnostics(
  params: SalesAnalyticsParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['analytics', 'unmapped-sales', params],
    queryFn: () => analyticsApi.getUnmappedSales(params),
    enabled,
  });
}
