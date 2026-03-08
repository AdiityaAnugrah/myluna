import apiClient from './client';
import { Purchase, ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

export const purchasesApi = {
  getAll: async (params?: PaginationParams & { status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Purchase>>('/purchases', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Purchase>>(`/purchases/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<ApiResponse<Purchase>>('/purchases', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<Purchase>>(`/purchases/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/purchases/${id}`);
    return response.data;
  },
};
