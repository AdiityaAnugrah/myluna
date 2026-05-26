import apiClient from './client';
import { Complaint, ApiResponse, Sale } from '@/types';

export const complaintsApi = {
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
  }) => {
    const response = await apiClient.get('/complaints', { params });
    return response.data;
  },

  review: async (id: string, payload: { decision: 'ACCEPT' | 'REJECT'; rejectionReason?: string }) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/review`, payload);
    return response.data;
  },

  shipReplacement: async (id: string, data: FormData) => {
    const response = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}/ship`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
