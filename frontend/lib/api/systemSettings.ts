import apiClient from './client';
import type { ApiResponse, SystemSetting } from '@/types';

export const systemSettingsApi = {
  getAll: async () => (await apiClient.get<ApiResponse<SystemSetting[]>>('/system-settings')).data,
  update: async (key: string, value: string) =>
    (await apiClient.patch<ApiResponse<SystemSetting>>(`/system-settings/${key}`, { value })).data,
};
