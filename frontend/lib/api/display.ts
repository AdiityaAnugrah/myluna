import apiClient from './client';
import { ApiResponse } from '@/types';
import type {
  DisplayCategory,
  DisplayProduct,
  DisplayStockMovement,
  DisplayStockRequest,
  DisplaySupplier,
} from '@/types';

export const displayApi = {
  getSummary: async () => (await apiClient.get<ApiResponse<any>>('/display/summary')).data,
  getCategories: async () => (await apiClient.get<ApiResponse<DisplayCategory[]>>('/display/categories', { params: { isActive: 'all' } })).data,
  createCategory: async (data: Partial<DisplayCategory>) => (await apiClient.post<ApiResponse<DisplayCategory>>('/display/categories', data)).data,
  updateCategory: async (id: string, data: Partial<DisplayCategory>) => (await apiClient.put<ApiResponse<DisplayCategory>>(`/display/categories/${id}`, data)).data,

  getSuppliers: async () => (await apiClient.get<ApiResponse<DisplaySupplier[]>>('/display/suppliers', { params: { isActive: 'all' } })).data,
  createSupplier: async (data: Partial<DisplaySupplier>) => (await apiClient.post<ApiResponse<DisplaySupplier>>('/display/suppliers', data)).data,
  updateSupplier: async (id: string, data: Partial<DisplaySupplier>) => (await apiClient.put<ApiResponse<DisplaySupplier>>(`/display/suppliers/${id}`, data)).data,

  getProducts: async (params?: { page?: number; limit?: number; search?: string; categoryId?: string; status?: string }) =>
    (await apiClient.get<ApiResponse<{ products: DisplayProduct[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>>('/display/products', { params })).data,
  createProduct: async (data: Partial<DisplayProduct>) => (await apiClient.post<ApiResponse<DisplayProduct>>('/display/products', data)).data,
  updateProduct: async (id: string, data: Partial<DisplayProduct>) => (await apiClient.put<ApiResponse<DisplayProduct>>(`/display/products/${id}`, data)).data,
  adjustStock: async (id: string, data: { type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; targetStock?: number; notes?: string }) =>
    (await apiClient.post<ApiResponse<DisplayProduct>>(`/display/products/${id}/adjust-stock`, data)).data,

  getMovements: async (params?: { productId?: string; limit?: number }) =>
    (await apiClient.get<ApiResponse<DisplayStockMovement[]>>('/display/movements', { params })).data,

  getRequests: async (params?: { status?: string }) =>
    (await apiClient.get<ApiResponse<DisplayStockRequest[]>>('/display/requests', { params })).data,
  createRequest: async (data: { productId: string; type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: number; targetStock?: number; reason: string }) =>
    (await apiClient.post<ApiResponse<DisplayStockRequest>>('/display/requests', data)).data,
  reviewRequest: async (id: string, data: { action: 'approve' | 'reject'; rejectionReason?: string }) =>
    (await apiClient.post<ApiResponse<DisplayStockRequest>>(`/display/requests/${id}/review`, data)).data,
};
