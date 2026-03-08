import apiClient from './client';
import { Supplier, ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

export const supplierApi = {
  getAll: async (params?: PaginationParams & { search?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: Partial<Supplier>) => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Supplier>) => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },
};
