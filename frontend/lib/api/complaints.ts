import apiClient from './client';
import { Complaint, ApiResponse, ComplaintListData, Sale } from '@/types';

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
};
