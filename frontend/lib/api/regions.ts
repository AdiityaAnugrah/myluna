import apiClient from './client';
import { ApiResponse, RegionOption, VillageOption } from '@/types';

export const regionsApi = {
  getProvinces: async () => {
    const response = await apiClient.get<ApiResponse<RegionOption[]>>('/regions/provinces');
    return response.data;
  },

  getRegencies: async (provinceId: string) => {
    const response = await apiClient.get<ApiResponse<RegionOption[]>>('/regions/regencies', {
      params: { provinceId },
    });
    return response.data;
  },

  getDistricts: async (regencyId: string) => {
    const response = await apiClient.get<ApiResponse<RegionOption[]>>('/regions/districts', {
      params: { regencyId },
    });
    return response.data;
  },

  getVillages: async (districtId: string) => {
    const response = await apiClient.get<ApiResponse<VillageOption[]>>('/regions/villages', {
      params: { districtId },
    });
    return response.data;
  },
};
