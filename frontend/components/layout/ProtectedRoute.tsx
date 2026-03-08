'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      console.log('ProtectedRoute Check:', { pathname, isAuthenticated, role: user?.role });

      // Strict RBAC URL protection
      if (user?.role) {
        // Safely extract role name whether it's an object or a string
        const role = typeof user.role === 'object' && user.role !== null && 'name' in user.role 
          ? (user.role as any).name 
          : String(user.role);
        
        console.log('Role extracted:', role);
        // Define restricted paths
        const restrictions = [
          { path: '/users', roles: ['SUPER_ADMIN'] },
          { path: '/platforms', roles: ['SUPER_ADMIN'] },
          { path: '/finance', roles: ['SUPER_ADMIN', 'ADMIN'] },
          // { path: '/products', roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] }, // Temporarily disable product restriction for debugging
        ];

        const restriction = restrictions.find(r => pathname.startsWith(r.path));
        
        if (restriction && !restriction.roles.includes(role)) {
          console.warn('Access denied for:', pathname, 'Role:', role);
          // Redirect unauthorized access to home/dashboard
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, isHydrated, router, user, pathname]);

  // Show nothing while hydrating or not authenticated
  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
