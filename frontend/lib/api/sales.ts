import apiClient from './client';
import { Sale, ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

export const salesApi = {
  getAll: async (params?: PaginationParams & { status?: string; search?: string; startDate?: string; endDate?: string; paymentMethod?: string; platform?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Sale>>('/sales', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/sales/stats');
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<ApiResponse<Sale>>('/sales', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<Sale>>(`/sales/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/sales/${id}`);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/approve`);
    return response.data;
  },

  reject: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/reject`);
    return response.data;
  },

  process: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/process`);
    return response.data;
  },

  requestCancel: async (id: string, reason: string) => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/request-cancel`, { reason });
    return response.data;
  },
};
