import { useQuery } from '@tanstack/react-query';
import { analyticsApi, SalesAnalyticsParams } from '@/lib/api/analytics';

export function useSalesAnalytics(params: SalesAnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'sales', params],
    queryFn: () => analyticsApi.getSales(params),
  });
}
