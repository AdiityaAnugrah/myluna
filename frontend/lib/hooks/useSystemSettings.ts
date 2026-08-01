import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { systemSettingsApi } from '@/lib/api/systemSettings';

export function useSystemSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: systemSettingsApi.getAll,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => systemSettingsApi.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Pengaturan sistem berhasil disimpan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan pengaturan sistem');
    },
  });
}
