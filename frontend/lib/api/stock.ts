import apiClient from './client';
import { StockMovement, ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

export const stockApi = {
  getMovements: async (params?: PaginationParams & { productId?: string; type?: string }) => {
    const response = await apiClient.get<PaginatedResponse<StockMovement>>('/stock/movements', { params });
    return response.data;
  },

  // Backend doesn't support getById yet, but correcting path just in case we add it later or if it was intended
  getMovementById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<StockMovement>>(`/stock/movements/${id}`);
    return response.data;
  },

  createAdjustment: async (data: { productId: string; variantName?: string | null; quantity: number; type: 'IN' | 'OUT'; notes?: string }) => {
    const response = await apiClient.post<ApiResponse<StockMovement>>('/stock/adjustment', data);
    return response.data;
  },
};
