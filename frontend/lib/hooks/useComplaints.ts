import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { complaintsApi } from '../api/complaints';
import { toast } from 'sonner';

type ApiErrorResponse = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || fallback;
}

export function useEligibleComplaintSales(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['complaints', 'eligible-sales', query],
    queryFn: () => complaintsApi.getEligibleSales(query),
    enabled: !!query && query.trim().length >= 2 && (options?.enabled ?? true),
  });
}

export function useComplaints(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: () => complaintsApi.getAll(params),
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => complaintsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Komplen berhasil dikirim');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal mengirim komplen'));
    },
  });
}

export function useReviewComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, rejectionReason }: { id: string; decision: 'ACCEPT' | 'REJECT'; rejectionReason?: string }) =>
      complaintsApi.review(id, { decision, rejectionReason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success(variables.decision === 'ACCEPT' ? 'Komplen diterima' : 'Komplen ditolak');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memproses komplen'));
    },
  });
}

export function useShipComplaintReplacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => complaintsApi.shipReplacement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Resi pengganti berhasil diunggah');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal mengunggah resi pengganti'));
    },
  });
}
