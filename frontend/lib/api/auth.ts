import apiClient from './client';

export interface LoginCredentials {
  credential: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      username: string;
      fullName: string;
      role: string;
    };
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  heartbeat: async (): Promise<{ success: boolean; data: { lastActivityAt: string; totalDuration: number } }> => {
    const response = await apiClient.post('/auth/heartbeat');
    return response.data;
  },
};
