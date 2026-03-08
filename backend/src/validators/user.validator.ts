
import { z } from 'zod';

export const userValidators = {
  create: z.object({
    body: z.object({
      username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
      email: z.string().email('Format email tidak valid'),
      password: z.string().min(6, 'Password minimal 6 karakter').regex(/[a-zA-Z]/, 'Password harus mengandung setidaknya satu huruf'),
      fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
      roleId: z.string().uuid('Role ID tidak valid'),
    }),
  }),

  update: z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      username: z.string().min(3).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).regex(/[a-zA-Z]/).optional(),
      fullName: z.string().min(1).optional(),
      roleId: z.string().uuid().optional(),
    }),
  }),
};
