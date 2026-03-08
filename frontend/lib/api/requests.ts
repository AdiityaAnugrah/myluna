import { apiClient } from './client';
import { ApiResponse, ProductStatusRequest, SaleReturnRequest, ChangeRequest } from '@/types';

export const requestsApi = {
  // Product Status Requests
  createProductRequest: async (data: { productId: string; requestedStatus: 'ACTIVE' | 'PASSIVE'; reason: string }) => {
    const response = await apiClient.post<ApiResponse<ProductStatusRequest>>('/product-requests', data);
    return response.data;
  },

  infoProductPending: async () => {
    const response = await apiClient.get<ApiResponse<ProductStatusRequest[]>>('/product-requests/pending');
    return response.data;
  },

  approveProductRequest: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<ProductStatusRequest>>(`/product-requests/${id}/approve`);
    return response.data;
  },

  rejectProductRequest: async (id: string, rejectionReason: string) => {
    const response = await apiClient.patch<ApiResponse<ProductStatusRequest>>(`/product-requests/${id}/reject`, { rejectionReason });
    return response.data;
  },

  // Sale Return Requests
  createSaleRequest: async (data: { saleId: string; type: 'RETURN' | 'EXCHANGE'; reason: string }) => {
    const response = await apiClient.post<ApiResponse<SaleReturnRequest>>('/sale-requests', data);
    return response.data;
  },

  infoSalePending: async () => {
    const response = await apiClient.get<ApiResponse<SaleReturnRequest[]>>('/sale-requests/pending');
    return response.data;
  },

  approveSaleRequest: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<SaleReturnRequest>>(`/sale-requests/${id}/approve`);
    return response.data;
  },

  rejectSaleRequest: async (id: string, rejectionReason: string) => {
    const response = await apiClient.patch<ApiResponse<SaleReturnRequest>>(`/sale-requests/${id}/reject`, { rejectionReason });
    return response.data;
  },
};

export const changeRequestsApi = {
  listPending: async () => {
    const response = await apiClient.get<ApiResponse<ChangeRequest[]>>('/change-requests/pending');
    return response.data;
  },

  createStockRequest: async (data: { productId: string; quantity: number; type: 'IN' | 'OUT'; notes?: string }) => {
    const payload = JSON.stringify(data);
    const response = await apiClient.post('/change-requests', {
      entityType: 'STOCK',
      entityId: data.productId,
      requestType: 'CREATE',
      payload,
    });
    return response.data;
  },

  approve: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<ChangeRequest>>(`/change-requests/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, rejectionReason: string) => {
    const response = await apiClient.patch<ApiResponse<ChangeRequest>>(`/change-requests/${id}/reject`, { rejectionReason });
    return response.data;
  },
};
