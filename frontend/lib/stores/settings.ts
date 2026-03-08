import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client'; // Assuming this exists or similar

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  primaryColor: 'red' | 'blue' | 'green' | 'violet' | 'orange' | 'pink' | 'rose' | 'amber' | 'slate';
  isSynced: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void;
  setPrimaryColor: (color: 'red' | 'blue' | 'green' | 'violet' | 'orange' | 'pink' | 'rose' | 'amber' | 'slate') => void;
  syncWithBackend: () => Promise<void>;
  updateBackend: (settings: { theme?: string; fontSize?: string; primaryColor?: string }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      fontSize: 'medium',
      primaryColor: 'red',
      isSynced: false,
      setTheme: (theme) => {
        set({ theme });
        get().updateBackend({ theme });
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        get().updateBackend({ fontSize });
      },
      setPrimaryColor: (primaryColor) => {
        set({ primaryColor });
        get().updateBackend({ primaryColor });
      },
      syncWithBackend: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token || get().isSynced) return;

        try {
          const { data } = await apiClient.get('/auth/me');
           if (data?.data?.settings) {
            set({ 
                theme: data.data.settings.theme || 'system',
                fontSize: data.data.settings.fontSize || 'medium',
                primaryColor: data.data.settings.primaryColor || 'red',
                isSynced: true
            });
          } else {
            set({ isSynced: true });
          }
        } catch (error: any) {
          // Only log if it's not a 401 (which is handled by api client interceptors)
          if (error.response?.status !== 401) {
            console.error('Failed to sync settings:', error);
          }
        }
      },
      updateBackend: async (settings) => {
        try {
            await apiClient.patch('/users/settings', settings);
        } catch (error) {
            console.error('Failed to update backend settings:', error);
        }
      }
    }),
    {
      name: 'user-settings',
      version: 2,
      partialize: (state) => {
        const { isSynced, ...rest } = state;
        return rest;
      },
      migrate: (persistedState: any, version: number) => {
        if (version === 1) {
          // If version is 1, add default primaryColor
          return {
            ...persistedState,
            primaryColor: 'red',
          };
        }
        return persistedState;
      },
    }
  )
);
