import apiClient from './client';
import { Product, Category, PaginatedResponse, ApiResponse, PaginationParams } from '@/types';

export const productApi = {
  getAll: async (params?: PaginationParams & { search?: string; categoryId?: string; lowStock?: boolean; isActive?: boolean }) => {
    const response = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products/low-stock');
    return response.data;
  },

  create: async (data: Partial<Product>) => {
    const response = await apiClient.post<ApiResponse<Product>>('/products', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Product>) => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  },

  requestPriceChange: async (
    id: string,
    data: {
      purchasePrice?: number;
      sellingPrice?: number;
      warrantyPrice?: number | null;
      reason?: string;
    }
  ) => {
    const response = await apiClient.post<ApiResponse<any>>(`/products/${id}/price-change-requests`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  bulkDelete: async (ids: string[]) => {
    const response = await apiClient.post('/products/bulk/delete', { ids });
    return response.data;
  },

  bulkUpdate: async (ids: string[], updates: any) => {
    const response = await apiClient.post('/products/bulk/update', { ids, updates });
    return response.data;
  },
};

export const categoryApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: Partial<Category>) => {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Category>) => {
    const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};
