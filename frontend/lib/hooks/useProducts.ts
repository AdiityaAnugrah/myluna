import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { productApi, categoryApi } from '../api/products';
import { toast } from 'sonner';
import { Product, PaginationParams } from '@/types';

export function useProducts(params?: PaginationParams & { search?: string; categoryId?: string; lowStock?: boolean; isActive?: boolean }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.getAll(params),
    ...options,
  });
}

export function useInfiniteProducts(params?: { search?: string; categoryId?: string; isActive?: boolean; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      productApi.getAll({ ...params, page: pageParam as number, limit: params?.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage.data;
      if (pagination && pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      console.log('Fetching product with ID:', id);
      try {
        const result = await productApi.getById(id);
        console.log('Product fetch result:', result);
        return result;
      } catch (error) {
        console.error('Product fetch error:', error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => productApi.getLowStock(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) => productApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Produk berhasil dibuat');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal membuat produk';
      toast.error(message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productApi.update(id, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      if (response?.data?.status === 'PENDING') {
        toast.info('Permintaan perubahan dikirim untuk persetujuan admin');
      } else {
        toast.success('Produk berhasil diperbarui');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal memperbarui produk';
      toast.error(message);
    },
  });
}

export function useRequestProductPriceChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        purchasePrice?: number;
        sellingPrice?: number;
        warrantyPrice?: number | null;
        reason?: string;
      };
    }) => productApi.requestPriceChange(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests'] });
      toast.success('Pengajuan perubahan harga berhasil dikirim ke Admin');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal mengajukan perubahan harga';
      toast.error(message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menghapus produk');
    },
  });
}

// Bulk delete products
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await productApi.bulkDelete(ids);
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const count = response?.data?.deletedCount || 0;
      toast.success(`${count} produk berhasil dihapus`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menghapus produk');
    },
  });
}

// Bulk update products
export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const response = await productApi.bulkUpdate(ids, updates);
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const count = response?.data?.updatedCount || 0;
      toast.success(`${count} produk berhasil diperbarui`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal memperbarui produk');
    },
  });
}
