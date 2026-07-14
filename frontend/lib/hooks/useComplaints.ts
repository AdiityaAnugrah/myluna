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
  scope?: 'active' | 'history';
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: () => complaintsApi.getAll(params),
    ...(options ?? {}),
  });
}


export function useComplaintDetail(id?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: () => complaintsApi.getById(id!),
    enabled: !!id && (options?.enabled ?? true),
  });
}

function invalidateComplaintFlow(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['complaints'] });
  queryClient.invalidateQueries({ queryKey: ['returns'] });
  queryClient.invalidateQueries({ queryKey: ['stock'] });
  queryClient.invalidateQueries({ queryKey: ['settlements'] });
}

export function useSetComplaintDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resolutionType: string; resolutionNotes?: string } }) => complaintsApi.setDecision(id, data),
    onSuccess: () => { invalidateComplaintFlow(queryClient); toast.success('Keputusan komplen berhasil disimpan'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Gagal menyimpan keputusan komplen')),
  });
}

export function useRecordComplaintSettlementDeduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { deductionAmount: number; netReceivedAmount: number; deductionReason: string; settlementDate?: string; notes?: string } }) => complaintsApi.recordSettlementDeduction(id, data),
    onSuccess: () => { invalidateComplaintFlow(queryClient); toast.success('Potongan marketplace berhasil dicatat'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Gagal mencatat potongan marketplace')),
  });
}

export function useProcessComplaintComponentShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { items: Array<{ productId: string; variantName?: string | null; quantity: number; notes?: string }>; shippingService?: string; shippingCost?: number; notes?: string } }) => complaintsApi.processComponentShipment(id, data),
    onSuccess: () => { invalidateComplaintFlow(queryClient); toast.success('Komponen/pengganti berhasil dikirim'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Gagal memproses kirim komponen')),
  });
}

export function useConvertComplaintToReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { items: Array<{ saleItemId: string; qtyRequested: number }>; reason?: string; notes?: string } }) => complaintsApi.convertToReturn(id, data),
    onSuccess: () => { invalidateComplaintFlow(queryClient); toast.success('Komplen berhasil dijadikan retur'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Gagal menjadikan komplen ke retur')),
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

export function useClaimComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => complaintsApi.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Komplen berhasil diterima untuk diproses');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menerima komplen untuk diproses'));
    },
  });
}

export function useMarkComplaintHandled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => complaintsApi.markHandled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Komplen berhasil ditandai pengganti sudah dikirim');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menandai pengganti sudah dikirim'));
    },
  });
}

export function useRequestComplaintFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => complaintsApi.requestFollowUp(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Komplen berhasil dikembalikan untuk tindak lanjut');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal meminta tindak lanjut komplen'));
    },
  });
}

export function useCompleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => complaintsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Komplen berhasil diselesaikan');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyelesaikan komplen'));
    },
  });
}
