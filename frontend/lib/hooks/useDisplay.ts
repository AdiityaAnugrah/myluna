import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { displayApi } from '@/lib/api/display';
import type { DisplayCategory, DisplayProduct, DisplaySupplier } from '@/types';

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export function useDisplaySummary() {
  return useQuery({ queryKey: ['display', 'summary'], queryFn: displayApi.getSummary });
}

export function useDisplayCategories() {
  return useQuery({ queryKey: ['display', 'categories'], queryFn: displayApi.getCategories });
}

export function useDisplaySuppliers() {
  return useQuery({ queryKey: ['display', 'suppliers'], queryFn: displayApi.getSuppliers });
}

export function useDisplayProducts(params?: { page?: number; limit?: number; search?: string; categoryId?: string; status?: string }) {
  return useQuery({ queryKey: ['display', 'products', params], queryFn: () => displayApi.getProducts(params) });
}

export function useDisplayMovements(params?: { productId?: string; limit?: number }) {
  return useQuery({ queryKey: ['display', 'movements', params], queryFn: () => displayApi.getMovements(params) });
}

export function useDisplayRequests(params?: { status?: string }) {
  return useQuery({ queryKey: ['display', 'requests', params], queryFn: () => displayApi.getRequests(params) });
}

export function useCreateDisplayCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<DisplayCategory>) => displayApi.createCategory(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Kategori display berhasil dibuat'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal membuat kategori display')) });
}

export function useCreateDisplaySupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<DisplaySupplier>) => displayApi.createSupplier(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Supplier display berhasil dibuat'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal membuat supplier display')) });
}

export function useCreateDisplayProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<DisplayProduct>) => displayApi.createProduct(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Produk display berhasil dibuat'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal membuat produk display')) });
}

export function useAdjustDisplayStock() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: { type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; targetStock?: number; notes?: string } }) => displayApi.adjustStock(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Stok display berhasil disesuaikan'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal menyesuaikan stok display')) });
}

export function useCreateDisplayRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { productId: string; type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: number; targetStock?: number; reason: string }) => displayApi.createRequest(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Pengajuan stok display berhasil dikirim'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal mengirim pengajuan stok display')) });
}

export function useReviewDisplayRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, action, rejectionReason }: { id: string; action: 'approve' | 'reject'; rejectionReason?: string }) => displayApi.reviewRequest(id, { action, rejectionReason }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['display'] }); toast.success('Pengajuan stok display berhasil diproses'); }, onError: (e) => toast.error(errorMessage(e, 'Gagal memproses pengajuan stok display')) });
}
