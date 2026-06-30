import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { returnTicketsApi } from '@/lib/api/returnTickets';

type ApiErrorResponse = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || fallback;
}

export function useReturnTickets(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    overdue?: boolean;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['return-tickets', params],
    queryFn: () => returnTicketsApi.getAll(params),
    enabled: options?.enabled ?? true,
  });
}

export function useReturnTicketSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['return-tickets', 'summary'],
    queryFn: () => returnTicketsApi.getSummary(),
    enabled: options?.enabled ?? true,
    refetchInterval: 30_000,
  });
}

export function useReturnTicket(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['return-tickets', 'detail', id],
    queryFn: () => returnTicketsApi.getById(id),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useMarkReturnTicketAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => returnTicketsApi.markAsRead(id),
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', ticketId] });
    },
  });
}

export function useAddReturnTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { message: string } }) => returnTicketsApi.addMessage(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', variables.id] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal mengirim pesan tiket'));
    },
  });
}

export function useUpdateReturnTicketDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { deadlineAt: string } }) =>
      returnTicketsApi.updateDeadline(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', variables.id] });
      toast.success('Batas waktu tiket berhasil diperbarui');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memperbarui deadline tiket'));
    },
  });
}

export function useFinalizeReturnTicketDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        finalDecision: 'RESEND_UNIT' | 'SEND_COMPONENT' | 'RESTOCK';
        finalDecisionNotes?: string;
      };
    }) => returnTicketsApi.finalizeDecision(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', variables.id] });
      toast.success('Keputusan tiket berhasil difinalisasi');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memfinalisasi keputusan tiket'));
    },
  });
}

export function useStartReturnTicketExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => returnTicketsApi.startExecution(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', variables.id] });
      toast.success('Eksekusi tiket berhasil dimulai');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memulai eksekusi tiket'));
    },
  });
}

export function useCompleteReturnTicketExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        notes?: string;
        shippingService?: string;
        shippingCost?: number;
        expenseAmount?: number;
        items?: Array<{
          returnItemId: string;
          qtyReceived: number;
          replacementQty?: number;
          replacementProductId?: string;
          replacementVariantName?: string | null;
        }>;
      };
    }) => returnTicketsApi.completeExecution(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['return-tickets', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Eksekusi tiket berhasil diselesaikan');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyelesaikan eksekusi tiket'));
    },
  });
}
