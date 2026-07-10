import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { returnsApi } from '@/lib/api/returns';
import { toast } from 'sonner';

type ApiErrorResponse = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || fallback;
}

export function useEligibleReturnSales(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['returns', 'eligible-sales', query],
    queryFn: () => returnsApi.getEligibleSales(query),
    enabled: !!query && query.trim().length >= 2 && (options?.enabled ?? true),
  });
}

export function useReturns(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['returns', params],
    queryFn: () => returnsApi.getAll(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReturn(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['returns', 'detail', id],
    queryFn: () => returnsApi.getById(id),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => returnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Retur berhasil diajukan');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal mengajukan retur'));
    },
  });
}

export function useReviewReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string } }) =>
      returnsApi.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Keputusan review retur berhasil disimpan');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyimpan keputusan review retur'));
    },
  });
}

export function useReceiveReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => returnsApi.receive(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Retur berhasil ditandai barang sudah diterima');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menandai barang sudah diterima'));
    },
  });
}

export function useInspectReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        inspectionResult: 'GOOD' | 'NOT_GOOD';
        inspectionNotes?: string;
      };
    }) => returnsApi.inspect(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns', 'detail', variables.id] });
      toast.success('Hasil inspeksi retur berhasil disimpan');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyimpan inspeksi retur'));
    },
  });
}

export function useRestockReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { inspectionNotes?: string; items: Array<{ returnItemId: string; qtyReceived: number }> } }) =>
      returnsApi.restock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Retur berhasil dimasukkan ke stok');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memproses restock retur'));
    },
  });
}

export function useWriteOffReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        inspectionNotes?: string;
        finalOutcomeNotes?: string;
        lossAmount?: number;
        incomeLostAmount?: number;
        items: Array<{ returnItemId: string; qtyWrittenOff: number; itemNotes?: string }>;
      };
    }) => returnsApi.writeOff(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Retur berhasil ditandai hangus');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menandai retur hangus'));
    },
  });
}

export function useRepairRestockReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        inspectionNotes?: string;
        repairNotes?: string;
        finalOutcomeNotes?: string;
        repairCost?: number;
        incomeLostAmount?: number;
        items: Array<{
          returnItemId: string;
          qtyRepaired: number;
          qtyRestocked: number;
          itemNotes?: string;
        }>;
      };
    }) => returnsApi.repairRestock(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['returns', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Retur revisi berhasil dikembalikan ke stok');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memproses retur revisi'));
    },
  });
}

export function useDamageReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        inspectionNotes?: string;
        financialImpactAmount?: number;
        items: Array<{ returnItemId: string; qtyReceived: number }>;
      };
    }) => returnsApi.damaged(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Retur berhasil ditandai tidak layak pakai');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menandai retur tidak layak pakai'));
    },
  });
}

export function useResendReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        inspectionNotes?: string;
        resendShippingService: string;
        resendShippingCost: number;
        items: Array<{
          returnItemId: string;
          qtyReceived: number;
          replacementProductId?: string;
          replacementVariantName?: string | null;
          replacementQty?: number;
        }>;
      };
    }) => returnsApi.resend(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Pengiriman pengganti berhasil diproses');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memproses pengiriman pengganti'));
    },
  });
}
