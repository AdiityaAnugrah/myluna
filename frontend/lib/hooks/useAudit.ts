import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/audit';

export function useDailyAuditStats(params?: { userId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['audit-stats-daily', params],
    queryFn: () => auditApi.getDailyStats(params),
    enabled: true,
  });
}

export function useAuditLogs(params?: any) {
    return useQuery({
      queryKey: ['audit-logs', params],
      queryFn: () => auditApi.getAll(params),
    });
}
