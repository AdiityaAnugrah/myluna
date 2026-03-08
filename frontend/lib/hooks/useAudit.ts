import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLogParams } from '../api/audit';

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}
