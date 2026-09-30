import apiClient from './client';
import { ApiResponse, InventoryLoan, PaginatedResponse, PaginationParams, ProductLocationStock } from '@/types';

export interface InventoryLoanCreatePayload {
  direction: 'TO_CENTER' | 'FROM_CENTER';
  loanDate: string;
  borrowerName: string;
  targetName: string;
  notes?: string | null;
  submittedSignatureName?: string | null;
  submittedSignature?: string | null;
  acknowledgedSignatureName?: string | null;
  acknowledgedSignature?: string | null;
  receivedSignatureName?: string | null;
  receivedSignature?: string | null;
  items: Array<{
    productId: string;
    variantName?: string | null;
    quantity: number;
    condition: 'GOOD' | 'MINOR_DAMAGE' | 'DAMAGED' | 'OTHER';
    notes?: string | null;
  }>;
}

export const inventoryLoanApi = {
  getAll: async (
    params?: PaginationParams & {
      status?: string;
      direction?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await apiClient.get<PaginatedResponse<InventoryLoan>>('/inventory-loans', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<InventoryLoan>>(`/inventory-loans/${id}`);
    return response.data;
  },

  create: async (data: InventoryLoanCreatePayload) => {
    const response = await apiClient.post<ApiResponse<InventoryLoan>>('/inventory-loans', data);
    return response.data;
  },

  markReturned: async (id: string, returnNotes?: string) => {
    const response = await apiClient.post<ApiResponse<InventoryLoan>>(`/inventory-loans/${id}/return`, { returnNotes });
    return response.data;
  },

  getCenterStocks: async (params?: { productId?: string }) => {
    const response = await apiClient.get<ApiResponse<ProductLocationStock[]>>('/inventory-loans/center-stocks', { params });
    return response.data;
  },

  adjustCenterStock: async (data: {
    productId: string;
    variantName?: string | null;
    quantity: number;
    type?: 'SET' | 'IN' | 'OUT';
  }) => {
    const response = await apiClient.post<ApiResponse<ProductLocationStock>>('/inventory-loans/center-stocks/adjustment', data);
    return response.data;
  },
};
