import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryLoanApi, InventoryLoanCreatePayload } from '@/lib/api/inventoryLoans';
import { PaginationParams } from '@/types';

export function useInventoryLoans(
  params?: PaginationParams & { status?: string; direction?: string; search?: string; startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: ['inventory-loans', params],
    queryFn: () => inventoryLoanApi.getAll(params),
  });
}

export function useCreateInventoryLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InventoryLoanCreatePayload) => inventoryLoanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-loans'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Form pinjam barang berhasil disimpan dan stok sudah disesuaikan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan pinjam barang');
    },
  });
}

export function useReturnInventoryLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, returnNotes }: { id: string; returnNotes?: string }) =>
      inventoryLoanApi.markReturned(id, returnNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-loans'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Pinjaman berhasil ditandai kembali dan stok sudah dibalik');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menandai pinjaman kembali');
    },
  });
}

export function useCenterStocks(params?: { productId?: string }) {
  return useQuery({
    queryKey: ['center-stocks', params],
    queryFn: () => inventoryLoanApi.getCenterStocks(params),
  });
}

export function useAdjustCenterStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; variantName?: string | null; quantity: number; type?: 'SET' | 'IN' | 'OUT' }) =>
      inventoryLoanApi.adjustCenterStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-stocks'] });
      toast.success('Stok pusat/TCP berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal memperbarui stok pusat');
    },
  });
}
