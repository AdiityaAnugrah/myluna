import { useSales } from './useSales';
import { useChangeRequests, useProductRequests } from './useRequests';
import { useAuth } from './useAuth';

/**
 * Hook to get notification counts for various entities
 * Tracks pending sales and pending approval requests for admin roles
 */
export function useNotifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Fetch sales with WAITING_APPROVAL status
  const { data: salesData, isLoading: salesLoading } = useSales({ 
    limit: 1000,
    status: 'WAITING_APPROVAL'
  });

  // Fetch pending change requests (data master) - only for admin roles
  const { pendingRequests: changeRequests } = useChangeRequests({ enabled: isAdmin });

  // Fetch pending product status requests - only for admin roles
  const { pendingRequests: productRequests } = useProductRequests({ enabled: isAdmin });

  const pendingSalesCount = salesData?.data?.sales?.length || 0;

  // Only compute for admin roles to avoid unnecessary API calls influencing count
  const pendingChangeCount = isAdmin ? (changeRequests.data?.data?.length || 0) : 0;
  const pendingProductCount = isAdmin ? (productRequests.data?.data?.length || 0) : 0;
  const pendingApprovalsCount = pendingChangeCount + pendingProductCount;

  return {
    pendingSalesCount,
    pendingApprovalsCount,
    isLoading: salesLoading,
  };
}
