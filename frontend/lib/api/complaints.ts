import apiClient from './client';
import { Complaint, ApiResponse, ComplaintListData, Sale } from '@/types';

export const complaintsApi = {
  getSummary: async () => {
    const response = await apiClient.get<ApiResponse<{
      activeCount: number;
      pendingReviewCount: number;
      waitingUserConfirmationCount: number;
      waitingDeliveryConfirmationCount: number;
      monitoringCustomerConfirmationCount: number;
      followUpRequiredCount: number;
      badgeCount: number;
    }>>('/complaints/summary');
    return response.data;
  },

  getEligibleSales: async (q: string) => {
    const response = await apiClient.get<ApiResponse<Sale[]>>('/complaints/eligible-sales', {
      params: { q },
    });
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post<ApiResponse<Complaint>>('/complaints', data, {
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
    scope?: 'active' | 'history';
  }) => {
    const response = await apiClient.get<ApiResponse<ComplaintListData>>('/complaints', { params });
    return response.data;
  },

  claim: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/claim`);
    return response.data;
  },

  markHandled: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/mark-handled`);
    return response.data;
  },

  requestFollowUp: async (id: string, reason: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/request-follow-up`, { reason });
    return response.data;
  },

  confirmDelivered: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/confirm-delivered`);
    return response.data;
  },

  closeCase: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/close-case`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Complaint>>(`/complaints/${id}`);
    return response.data;
  },

  setDecision: async (id: string, data: { resolutionType: string; resolutionNotes?: string }) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/decision`, data);
    return response.data;
  },

  recordSettlementDeduction: async (id: string, data: { deductionAmount: number; netReceivedAmount: number; deductionReason: string; settlementDate?: string; notes?: string }) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/settlement-deduction`, data);
    return response.data;
  },

  processComponentShipment: async (id: string, data: { items: Array<{ productId: string; variantName?: string | null; quantity: number; notes?: string }>; shippingService?: string; shippingCost?: number; notes?: string }) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/component-shipment`, data);
    return response.data;
  },

  convertToReturn: async (id: string, data: { items: Array<{ saleItemId: string; qtyRequested: number }>; reason?: string; notes?: string }) => {
    const response = await apiClient.post<ApiResponse<{ complaint: Complaint; return: unknown }>>(`/complaints/${id}/convert-to-return`, data);
    return response.data;
  },

  complete: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/complete`);
    return response.data;
  },
};
