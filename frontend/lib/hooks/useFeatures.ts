import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { featuresApi, type UpdateFeaturePayload } from '@/lib/api/features';

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.getAll,
    staleTime: 60 * 1000,
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeaturePayload }) => featuresApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Pengaturan fitur berhasil disimpan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan pengaturan fitur');
    },
  });
}

export function useFeatureByPath(pathname: string | null | undefined) {
  const query = useFeatures();
  const features = query.data?.data || [];
  const feature = features
    .filter((item) => item.path)
    .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0))
    .find((item) => {
      if (!item.path || !pathname) return false;
      if (item.path === '/') return pathname === '/';
      return pathname === item.path || pathname.startsWith(`${item.path}/`);
    });

  return { ...query, feature };
}
