import { z } from 'zod';

export const authValidators = {
  login: z.object({
    body: z.object({
      credential: z.string().min(1, 'Email or Username is required'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  refresh: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),

  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Kata sandi saat ini diperlukan'),
      newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
    }),
  }),
};
