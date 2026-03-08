import api from './client';

export interface ShippingService {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const shippingApi = {
  getAll: async () => {
    const response = await api.get('/shipping-services');
    return response.data;
  },

  create: async (data: { name: string }) => {
    const response = await api.post('/shipping-services', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; isActive?: boolean }) => {
    const response = await api.put(`/shipping-services/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/shipping-services/${id}`);
    return response.data;
  },
};
