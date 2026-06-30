import apiClient from './client';
import {
  ApiResponse,
  ReturnTicket,
  ReturnTicketListData,
} from '@/types';

export const returnTicketsApi = {
  getSummary: async () => {
    const response = await apiClient.get<ApiResponse<{
      activeTicketsCount: number;
      unreadTicketsCount: number;
      actionRequiredTicketsCount: number;
      overdueTicketsCount: number;
      badgeCount: number;
    }>>('/return-tickets/summary');
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    overdue?: boolean;
  }) => {
    const response = await apiClient.get<ApiResponse<ReturnTicketListData>>('/return-tickets', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<ReturnTicket>>(`/return-tickets/${id}`);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<{ ticketId: string; lastReadAt: string }>>(`/return-tickets/${id}/read`);
    return response.data;
  },

  addMessage: async (id: string, data: { message: string }) => {
    const response = await apiClient.post<ApiResponse<ReturnTicket>>(`/return-tickets/${id}/messages`, data);
    return response.data;
  },

  updateDeadline: async (id: string, data: { deadlineAt: string }) => {
    const response = await apiClient.patch<ApiResponse<ReturnTicket>>(`/return-tickets/${id}/deadline`, data);
    return response.data;
  },

  finalizeDecision: async (
    id: string,
    data: {
      finalDecision: 'RESEND_UNIT' | 'SEND_COMPONENT' | 'RESTOCK';
      finalDecisionNotes?: string;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<ReturnTicket>>(`/return-tickets/${id}/finalize-decision`, data);
    return response.data;
  },

  startExecution: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<ReturnTicket>>(`/return-tickets/${id}/start-execution`);
    return response.data;
  },

  completeExecution: async (
    id: string,
    data: {
      notes?: string;
      shippingService?: string;
      shippingCost?: number;
      expenseAmount?: number;
      items?: Array<{
        returnItemId: string;
        qtyReceived: number;
        replacementQty?: number;
        replacementProductId?: string;
        replacementVariantName?: string | null;
      }>;
    }
  ) => {
    const response = await apiClient.patch<ApiResponse<ReturnTicket>>(`/return-tickets/${id}/complete-execution`, data);
    return response.data;
  },
};
