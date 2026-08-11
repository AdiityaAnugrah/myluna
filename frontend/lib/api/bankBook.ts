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
};
