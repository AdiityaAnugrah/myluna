import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementApi } from '../api/settlements';
import { toast } from 'sonner';

export const useSettlements = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'settled';
  search?: string;
  sortBy?: 'urgent' | 'terbaru';
  responsibleUserId?: string;
  userId?: string; // Add userId for cache isolation
}, options?: any) => {
  return useQuery({
    queryKey: ['settlements', params],
    queryFn: () => settlementApi.getAll(params),
    ...options,
  });
};

export const useSettlement = (id: string, options?: any) => {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: () => settlementApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => settlementApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-confirmation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(response?.message || 'Pelunasan berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat pelunasan');
    },
  });
};

export const useUpdateSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      settlementApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-stats'] });
      toast.success('Pelunasan berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui pelunasan');
    },
  });
};

export const useRequestCancelSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      settlementApi.requestCancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-stats'] });
      toast.success('Pengajuan pembatalan berhasil dikirim');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengajukan pembatalan');
    },
  });
};

export const useSettlementStats = (params?: { startDate?: string; endDate?: string }, options?: any) => {
  return useQuery({
    queryKey: ['settlement-stats', params],
    queryFn: () => settlementApi.getStats(params),
    ...options,
  });
};

export const useSettlementConfirmationRequests = (params?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
  search?: string;
  invoiceNumber?: string;
  customerName?: string;
  grossAmount?: string;
  netAmount?: string;
  difference?: string;
  settlementDate?: string;
  requestedBy?: string;
}, options?: any) => {
  return useQuery({
    queryKey: ['settlement-confirmation-requests', params],
    queryFn: () => settlementApi.getConfirmationRequests(params),
    ...options,
  });
};

export const useApproveSettlementConfirmation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      settlementApi.approveConfirmationRequest(id, reviewNotes),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['settlement-confirmation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(response?.message || 'Pelunasan berhasil dikonfirmasi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengonfirmasi pelunasan');
    },
  });
};

export const useRejectSettlementConfirmation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes: string }) =>
      settlementApi.rejectConfirmationRequest(id, reviewNotes),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['settlement-confirmation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success(response?.message || 'Pengajuan pelunasan berhasil ditolak');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menolak pengajuan pelunasan');
    },
  });
};
