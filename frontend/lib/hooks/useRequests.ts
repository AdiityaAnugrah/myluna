import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi, changeRequestsApi } from '@/lib/api/requests';

export function useChangeRequests(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const pendingRequestsQuery = useQuery({
    queryKey: ['changeRequests', 'pending'],
    queryFn: () => changeRequestsApi.listPending(),
    enabled: !!options?.enabled,
  });

  const approveRequestMutation = useMutation({
    mutationFn: changeRequestsApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-stats'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['omset-breakdown'] });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => changeRequestsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests'] });
    },
  });

  return {
    pendingRequests: pendingRequestsQuery,
    approveRequest: approveRequestMutation,
    rejectRequest: rejectRequestMutation,
  };
}

export function useProductRequests(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const pendingRequestsQuery = useQuery({
    queryKey: ['productRequests', 'pending'],
    queryFn: () => requestsApi.infoProductPending(),
    enabled: !!options?.enabled,
  });

  const createRequestMutation = useMutation({
    mutationFn: requestsApi.createProductRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRequests'] });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: requestsApi.approveProductRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRequests'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Refresh products to show new status
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requestsApi.rejectProductRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRequests'] });
    },
  });

  return {
    pendingRequests: pendingRequestsQuery,
    createRequest: createRequestMutation,
    approveRequest: approveRequestMutation,
    rejectRequest: rejectRequestMutation,
  };
}

export function useSaleRequests(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const pendingRequestsQuery = useQuery({
    queryKey: ['saleRequests', 'pending'],
    queryFn: () => requestsApi.infoSalePending(),
    enabled: !!options?.enabled,
  });

  const createRequestMutation = useMutation({
    mutationFn: requestsApi.createSaleRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleRequests'] });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: requestsApi.approveSaleRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleRequests'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] }); 
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requestsApi.rejectSaleRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleRequests'] });
    },
  });

  return {
    pendingRequests: pendingRequestsQuery,
    createRequest: createRequestMutation,
    approveRequest: approveRequestMutation,
    rejectRequest: rejectRequestMutation,
  };
}
