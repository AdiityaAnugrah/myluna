'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { findNavigationItemByPath } from '@/lib/features/catalog';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const pathname = usePathname();
  const { data: featuresResponse, isLoading: isLoadingFeatures } = useFeatures({ enabled: isAuthenticated });
  const features = featuresResponse?.data || [];
  const featureControlReady = features.length > 0;

  useEffect(() => {
    // Only redirect after hydration is complete
    if (hasHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      console.log('ProtectedRoute Check:', { pathname, isAuthenticated, role: user?.role });

      // Strict RBAC URL protection
      if (user?.role) {
        const role = String(user.role);
        const effectiveRole = user.isTestingMode ? 'SUPER_ADMIN' : role;
        
        console.log('Role extracted:', role);

        if (featureControlReady) {
          const navItem = findNavigationItemByPath(pathname);
          const isDev = effectiveRole === 'DEV';
          const allowedFeature = navItem
            ? features.find((feature) => feature.key === navItem.featureKey && feature.isEnabled)
            : undefined;

          if (navItem && !isDev && !allowedFeature) {
            console.warn('Feature access denied for:', pathname, 'Role:', effectiveRole, 'Feature:', navItem.featureKey);
            router.push('/');
            return;
          }
        }

        // Define restricted paths
        const restrictions = [
          { path: '/users', roles: ['SUPER_ADMIN', 'DEV'] },
          { path: '/platforms', roles: ['SUPER_ADMIN', 'DEV'] },
          { path: '/finance', roles: ['SUPER_ADMIN', 'ADMIN', 'DEV'] },
          { path: '/analytics', roles: ['SUPER_ADMIN', 'ADMIN', 'DEV'] },
          { path: '/display', roles: ['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP', 'DEV'] },
          // { path: '/products', roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] }, // Temporarily disable product restriction for debugging
        ];

        const restriction = !featureControlReady ? restrictions.find(r => pathname.startsWith(r.path)) : undefined;
        
        if (restriction && !restriction.roles.includes(effectiveRole)) {
          console.warn('Access denied for:', pathname, 'Role:', effectiveRole);
          // Redirect unauthorized access to home/dashboard
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, hasHydrated, router, user, pathname, featureControlReady, features]);

  // Show nothing while hydrating or not authenticated
  if (!hasHydrated || !isAuthenticated || (isAuthenticated && isLoadingFeatures)) {
    return null;
  }

  return <>{children}</>;
}
