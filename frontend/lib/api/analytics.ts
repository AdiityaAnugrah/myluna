import apiClient from './client';
import { ApiResponse, SalesAnalytics } from '@/types';

export interface SalesAnalyticsParams {
  startDate: string;
  endDate: string;
  regionLevel: 'province' | 'regency' | 'district' | 'village';
  limit?: number;
}

export const analyticsApi = {
  getSales: async (params: SalesAnalyticsParams) => {
    const response = await apiClient.get<ApiResponse<SalesAnalytics>>('/analytics/sales', { params });
    return response.data;
  },
};
