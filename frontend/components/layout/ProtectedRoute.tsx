'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const pathname = usePathname();

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
        // Define restricted paths
        const restrictions = [
          { path: '/users', roles: ['SUPER_ADMIN'] },
          { path: '/platforms', roles: ['SUPER_ADMIN'] },
          { path: '/finance', roles: ['SUPER_ADMIN', 'ADMIN'] },
          { path: '/analytics', roles: ['SUPER_ADMIN', 'ADMIN'] },
          // { path: '/products', roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] }, // Temporarily disable product restriction for debugging
        ];

        const restriction = restrictions.find(r => pathname.startsWith(r.path));
        
        if (restriction && !restriction.roles.includes(effectiveRole)) {
          console.warn('Access denied for:', pathname, 'Role:', effectiveRole);
          // Redirect unauthorized access to home/dashboard
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, hasHydrated, router, user, pathname]);

  // Show nothing while hydrating or not authenticated
  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
