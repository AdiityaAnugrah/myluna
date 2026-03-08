import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, LoginCredentials } from '../api/auth';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuth() {
  const auth = useAuthStore();
  return {
    ...auth,
    user: auth.user, // Ensure user property is explicit for consumers
  };
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      const { accessToken, refreshToken, user } = data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Berhasil masuk!');
      
      // Role-based redirection
      switch (user.role) {
        case 'CASHIER': // Future proofing
          router.push('/pos');
          break;
        case 'SUPER_ADMIN':
        case 'ADMIN':
        default:
          router.push('/');
          break;
      }
    },
    onError: (error: any) => {
      // Error is handled by the component using the mutation state
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      toast.success('Berhasil keluar');
      router.push('/login');
    },
    onError: () => {
      // Even if API call fails, clear local auth
      clearAuth();
      queryClient.clear();
      router.push('/login');
    },
  });
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Kata sandi berhasil diubah');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Gagal mengubah kata sandi';
      toast.error(message);
    },
  });
}
