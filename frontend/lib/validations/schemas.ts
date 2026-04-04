import { z } from 'zod';

export const loginSchema = z.object({
  credential: z.string().min(1, 'Email atau Username wajib diisi'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const productSchema = z.object({
  sku: z.string().optional().or(z.literal('')),
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  categoryId: z.string().uuid('Kategori tidak valid'),
  imageUrl: z.string().optional().or(z.literal('')),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  purchasePrice: z.number().min(0).optional().default(0),
  sellingPrice: z.number().min(0, 'Harga jual harus positif'),
  warrantyPrice: z.number().min(0, 'Harga garansi harus positif').nullable().optional(),
  stock: z.number().int().optional(),
  minStock: z.number().int().min(0, 'Min stok tidak boleh negatif'),
  variants: z.array(z.object({
    name: z.string().optional().default(''),
    value: z.string().min(1, 'Pilihan warna/varian wajib diisi'),
    priceAdjustment: z.number().default(0),
    stock: z.number().int().min(0).default(0),
  })).optional(),
  isActive: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  parentId: z.string().uuid('Parent kategori tidak valid').optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  contact: z.string().min(1, 'Kontak person wajib diisi'),
  phone: z.string().min(1, 'Telepon wajib diisi'),
  email: z.string().email('Format surel tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('Produk tidak valid'),
  type: z.enum(['IN', 'OUT']).refine((val) => val, { message: 'Tipe wajib dipilih' }),
  quantity: z.number().int().min(1, 'Jumlah harus minimal 1'),
  notes: z.string().optional(),
});

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;

export const userSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').regex(/[a-zA-Z]/, 'Password harus mengandung setidaknya satu huruf'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  roleId: z.string().min(1, 'Role wajib dipilih'),
});

export type UserFormData = z.infer<typeof userSchema>;

export const userUpdateSchema = userSchema.extend({
  password: z.string().min(6, 'Password minimal 6 karakter').regex(/[a-zA-Z]/, 'Password harus mengandung setidaknya satu huruf').optional().or(z.literal('')),
});

export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
