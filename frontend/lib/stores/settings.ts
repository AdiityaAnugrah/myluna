import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client'; // Assuming this exists or similar

export type PrimaryColor = 'umber' | 'blue' | 'green' | 'violet' | 'orange' | 'pink' | 'rose' | 'amber' | 'slate';

const primaryColors: PrimaryColor[] = ['umber', 'blue', 'green', 'violet', 'orange', 'pink', 'rose', 'amber', 'slate'];

const normalizePrimaryColor = (color?: string | null): PrimaryColor => {
  if (!color || color === 'red' || color === 'sage') return 'umber';
  return primaryColors.includes(color as PrimaryColor) ? (color as PrimaryColor) : 'umber';
};

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  primaryColor: PrimaryColor;
  isSynced: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  syncWithBackend: () => Promise<void>;
  updateBackend: (settings: { theme?: string; fontSize?: string; primaryColor?: string }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      fontSize: 'medium',
      primaryColor: 'umber',
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
                primaryColor: normalizePrimaryColor(data.data.settings.primaryColor),
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
      version: 4,
      partialize: (state) => {
        const { isSynced, ...rest } = state;
        return rest;
      },
      migrate: (persistedState: any, version: number) => {
        return {
          ...persistedState,
          primaryColor: normalizePrimaryColor(persistedState?.primaryColor),
        };
      },
    }
  )
);
