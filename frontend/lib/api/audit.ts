import apiClient from './client';
import { ApiResponse, PaginatedListResponse } from '@/types';

export interface AuditLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  before: any;
  after: any;
  ip: string;
  userAgent: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface DailyAuditStat {
  date: string;
  startTime: string;
  endTime: string;
  activityCount: number;
  user?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  entity?: string;
}

export const auditApi = {
  getAll: async (params?: AuditLogParams) => {
    const response = await apiClient.get<PaginatedListResponse<AuditLog>>('/audit-logs', { params });
    return response.data;
  },
  getDailyStats: async (params?: { userId?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<ApiResponse<DailyAuditStat[]>>('/audit-logs/stats/daily', { params });
    return response.data;
  },
};
