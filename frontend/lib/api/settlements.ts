import { apiClient } from './client';
import { Settlement } from '@/types';

export const settlementApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'settled';
    search?: string;
    sortBy?: 'urgent' | 'terbaru';
    responsibleUserId?: string;
  }) => {
    const response = await apiClient.get('/settlements', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/settlements/${id}`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post('/settlements', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await apiClient.put(`/settlements/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  requestCancel: async (id: string, reason: string) => {
    const response = await apiClient.post(`/settlements/${id}/request-cancel`, { reason });
    return response.data;
  },

  getStats: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/settlements/stats', { params });
    return response.data;
  },
};
