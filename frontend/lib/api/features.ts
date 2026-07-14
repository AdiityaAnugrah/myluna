import apiClient from './client';
import type { ApiResponse, AppRole, FeatureFlag } from '@/types';

export interface UpdateFeaturePayload {
  label?: string;
  description?: string | null;
  path?: string | null;
  isEnabled?: boolean;
  isDevelopment?: boolean;
  allowedRoles?: AppRole[];
}

export const featuresApi = {
  getAll: async () => (await apiClient.get<ApiResponse<FeatureFlag[]>>('/features')).data,
  update: async (id: string, data: UpdateFeaturePayload) =>
    (await apiClient.patch<ApiResponse<FeatureFlag>>(`/features/${id}`, data)).data,
};
