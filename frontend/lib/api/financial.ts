import { apiClient } from './client';

export const financialApi = {
  getSummary: async (params?: { startDate?: string; endDate?: string; page?: number; limit?: number; bookMode?: 'sales' | 'cost' }) => {
    const response = await apiClient.get('/financial-summary', { params });
    return response.data;
  },
  getOmsetBreakdown: async () => {
    const response = await apiClient.get('/financial-summary/omset-breakdown');
    return response.data;
  },
};
