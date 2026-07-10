import apiClient from './client';
import { ApiResponse, ReturnListData, Sale, SaleReturn } from '@/types';

export const returnsApi = {
  getSummary: async () => {
    const response = await apiClient.get<ApiResponse<{
      activeCount: number;
      pendingReviewCount: number;
      badgeCount: number;
    }>>('/returns/summary');
    return response.data;
  },

  getEligibleSales: async (q: string) => {
    const response = await apiClient.get<ApiResponse<Sale[]>>('/returns/eligible-sales', {
      params: { q },
    });
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post<ApiResponse<SaleReturn>>('/returns', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const response = await apiClient.get<ApiResponse<ReturnListData>>('/returns', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<SaleReturn>>(`/returns/${id}`);
    return response.data;
  },

  review: async (id: string, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/review`, data);
    return response.data;
  },

  receive: async (id: string, data: FormData) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/receive`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  inspect: async (
    id: string,
    data: {
      inspectionResult: 'GOOD' | 'NOT_GOOD';
      inspectionNotes?: string;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/inspection`, data);
    return response.data;
  },

  restock: async (id: string, data: { inspectionNotes?: string; items: Array<{ returnItemId: string; qtyReceived: number }> }) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/restock`, data);
    return response.data;
  },

  writeOff: async (
    id: string,
    data: {
      inspectionNotes?: string;
      finalOutcomeNotes?: string;
      lossAmount?: number;
      incomeLostAmount?: number;
      items: Array<{ returnItemId: string; qtyWrittenOff: number; itemNotes?: string }>;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/write-off`, data);
    return response.data;
  },

  repairRestock: async (
    id: string,
    data: {
      inspectionNotes?: string;
      repairNotes?: string;
      finalOutcomeNotes?: string;
      repairCost?: number;
      incomeLostAmount?: number;
      items: Array<{
        returnItemId: string;
        qtyRepaired: number;
        qtyRestocked: number;
        itemNotes?: string;
      }>;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/repair-restock`, data);
    return response.data;
  },

  damaged: async (
    id: string,
    data: {
      inspectionNotes?: string;
      financialImpactAmount?: number;
      items: Array<{ returnItemId: string; qtyReceived: number }>;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/damaged`, data);
    return response.data;
  },

  resend: async (
    id: string,
    data: {
      inspectionNotes?: string;
      resendShippingService: string;
      resendShippingCost: number;
      items: Array<{
        returnItemId: string;
        qtyReceived: number;
        replacementProductId?: string;
        replacementVariantName?: string | null;
        replacementQty?: number;
      }>;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<SaleReturn>>(`/returns/${id}/resend`, data);
    return response.data;
  },
};
