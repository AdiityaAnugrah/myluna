'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { useTheme } from 'next-themes';
import { useSettingsStore } from '@/lib/stores/settings';
import { SocketProvider } from '@/lib/contexts/SocketContext';

function SettingsSync() {
  const { fontSize, theme, primaryColor, syncWithBackend, isSynced } = useSettingsStore();
  const { setTheme } = useTheme();
  // Get auth state to avoid 401 on initial load / unauthorized users
  const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  useEffect(() => {
    if (isAuthenticated && !isSynced) {
      syncWithBackend();
    }
  }, [syncWithBackend, isAuthenticated, isSynced]);

  useEffect(() => {
    if (theme) setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-color', primaryColor || 'red');
  }, [primaryColor]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SettingsSync />
        <SocketProvider>
          {children}
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
