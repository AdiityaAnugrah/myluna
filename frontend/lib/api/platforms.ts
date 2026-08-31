import api from './client';

export interface Platform {
  id: string;
  name: string;
  feePercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const platformsApi = {
  getAll: async () => {
    const response = await api.get('/platforms');
    return response.data;
  },

  create: async (data: { name: string; feePercentage?: number }) => {
    const response = await api.post('/platforms', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; feePercentage?: number; isActive?: boolean }) => {
    const response = await api.put(`/platforms/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/platforms/${id}`);
    return response.data;
  },
};
