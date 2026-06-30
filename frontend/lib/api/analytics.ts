import apiClient from './client';
import { ApiResponse, OperationalAnalytics, SalesAnalytics, UnmappedSalesDiagnostics } from '@/types';

export interface SalesAnalyticsParams {
  startDate: string;
  endDate: string;
  regionLevel: 'province' | 'regency' | 'district' | 'village';
  scopeLevel?: 'province' | 'regency' | 'district' | 'village';
  scopeRegionId?: number;
  limit?: number;
}

export const analyticsApi = {
  getOperations: async (params?: Partial<SalesAnalyticsParams>) => {
    const response = await apiClient.get<ApiResponse<OperationalAnalytics>>('/analytics/operations', { params });
    return response.data;
  },
  getSales: async (params: SalesAnalyticsParams) => {
    const response = await apiClient.get<ApiResponse<SalesAnalytics>>('/analytics/sales', { params });
    return response.data;
  },
  getUnmappedSales: async (params: SalesAnalyticsParams) => {
    const response = await apiClient.get<ApiResponse<UnmappedSalesDiagnostics>>(
      '/analytics/unmapped-sales',
      { params: { ...params, limit: 100 } }
    );
    return response.data;
  },
};
