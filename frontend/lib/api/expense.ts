import apiClient from './client';

export const expenseApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
  }) => {
    return await apiClient.get('/expenses', { params });
  },

  getById: async (id: string) => {
    return await apiClient.get(`/expenses/${id}`);
  },

  create: async (data: {
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    notes?: string;
  }) => {
    return await apiClient.post('/expenses', data);
  },

  update: async (id: string, data: {
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    notes?: string;
  }) => {
    return await apiClient.put(`/expenses/${id}`, data);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/expenses/${id}`);
  },
};
