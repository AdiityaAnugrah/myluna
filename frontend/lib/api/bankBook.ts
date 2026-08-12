import { apiClient } from './client';

export const bankBookApi = {
  getCandidates: async (params?: {
    page?: number;
    limit?: number;
    source?: 'ALL' | 'SETTLEMENT' | 'REQUEST';
    platform?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/bank-book/candidates', { params });
    return response.data;
  },

  getEntries: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/bank-book/entries', { params });
    return response.data;
  },

  createEntry: async (data: {
    bankName: string;
    startDate: string;
    endDate: string;
    bankAmount: number;
    selectedIds: string[];
    notes?: string;
  }) => {
    const response = await apiClient.post('/bank-book/entries', data);
    return response.data;
  },
};
