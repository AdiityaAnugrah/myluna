import apiClient from './client';

export const otherIncomeApi = {
  getAll: async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    apiClient.get('/other-incomes', { params }),

  getById: async (id: string) =>
    apiClient.get(`/other-incomes/${id}`),

  create: async (formData: FormData) =>
    apiClient.post('/other-incomes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  update: async (id: string, formData: FormData) =>
    apiClient.put(`/other-incomes/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  delete: async (id: string) =>
    apiClient.delete(`/other-incomes/${id}`),
};
