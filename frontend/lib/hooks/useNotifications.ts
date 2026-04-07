import { useQuery } from '@tanstack/react-query';
import { useChangeRequests, useProductRequests } from './useRequests';
import { useAuth } from './useAuth';
import apiClient from '@/lib/api/client';

/**
 * Hook to get notification counts for various entities
 * Tracks pending sales and pending approval requests for admin roles
 */
export function useNotifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Fetch ONLY the stats endpoint instead of fetching all 1000 sales
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['sale-stats'],
    queryFn: () => apiClient.get('/sales/stats').then(r => r.data),
    refetchInterval: 30_000, // refetch every 30s
    enabled: !!user,
  });

  // Fetch pending change requests (data master) - only for admin roles
  const { pendingRequests: changeRequests } = useChangeRequests({ enabled: isAdmin });

  // Fetch pending product status requests - only for admin roles
  const { pendingRequests: productRequests } = useProductRequests({ enabled: isAdmin });

  // Fetch overdue pending settlements (>= 15 days) - only non-TCP roles
  const { data: overdueData } = useQuery({
    queryKey: ['settlements-overdue-count'],
    queryFn: async () => {
      // Fetch pending settlements with large limit to count overdue ones
      const res = await apiClient.get('/settlements', {
        params: { status: 'pending', limit: 500, sortBy: 'urgent' }
      });
      const settlements: any[] = res.data?.data?.settlements || [];
      const now = Date.now();
      const overdue = settlements.filter((item: any) => {
        const sale = item.sale || item;
        if (!sale?.processedAt) return false;
        const days = Math.floor((now - new Date(sale.processedAt).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 15;
      });
      return overdue.length;
    },
    refetchInterval: 60_000, // refetch every 60s
    enabled: !!user && user?.role !== 'TCP',
  });

  const pendingSalesCount = statsData?.data?.WAITING_APPROVAL || 0;

  // Only compute for admin roles to avoid unnecessary API calls influencing count
  const pendingChangeCount = isAdmin ? (changeRequests.data?.data?.length || 0) : 0;
  const pendingProductCount = isAdmin ? (productRequests.data?.data?.length || 0) : 0;
  const pendingApprovalsCount = pendingChangeCount + pendingProductCount;

  const overdueSettlementsCount = (overdueData as number) || 0;

  return {
    pendingSalesCount,
    pendingApprovalsCount,
    overdueSettlementsCount,
    isLoading: statsLoading,
  };
}
