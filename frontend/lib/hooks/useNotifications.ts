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

  const pendingSalesCount = statsData?.data?.WAITING_APPROVAL || 0;

  // Only compute for admin roles to avoid unnecessary API calls influencing count
  const pendingChangeCount = isAdmin ? (changeRequests.data?.data?.length || 0) : 0;
  const pendingProductCount = isAdmin ? (productRequests.data?.data?.length || 0) : 0;
  const pendingApprovalsCount = pendingChangeCount + pendingProductCount;

  return {
    pendingSalesCount,
    pendingApprovalsCount,
    isLoading: statsLoading,
  };
}
