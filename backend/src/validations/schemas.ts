import { z } from 'zod';

// Product Schema
export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi').max(50, 'SKU maksimal 50 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  description: z.string().optional(),
  categoryId: z.string().uuid('Kategori tidak valid'),
  imageUrl: z.string().optional().nullable(),
  length: z.number().min(0, 'Panjang harus positif').optional().nullable(),
  width: z.number().min(0, 'Lebar harus positif').optional().nullable(),
  height: z.number().min(0, 'Tinggi harus positif').optional().nullable(),
  weight: z.number().min(0, 'Berat harus positif').optional().nullable(),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  purchasePrice: z.number().min(0, 'Harga beli harus positif'),
  sellingPrice: z.number().min(0, 'Harga jual harus positif'),
  stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').optional(),
  minStock: z.number().int('Min stok harus bilangan bulat').min(0, 'Min stok tidak boleh negatif'),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

// Sale Schema
export const createSaleSchema = z.object({
  customerId: z.string().uuid('Customer tidak valid').optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid('Product tidak valid'),
    variantId: z.string().uuid('Variant tidak valid').optional().nullable(),
    quantity: z.number().int('Quantity harus bilangan bulat').min(1, 'Quantity minimal 1'),
    unitPrice: z.number().min(0, 'Harga harus positif'),
  })).min(1, 'Minimal 1 item diperlukan'),
  notes: z.string().optional().nullable(),
});

// Purchase Schema
export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid('Supplier tidak valid'),
  items: z.array(z.object({
    productId: z.string().uuid('Product tidak valid'),
    quantity: z.number().int('Quantity harus bilangan bulat').min(1, 'Quantity minimal 1'),
    unitCost: z.number().min(0, 'Harga harus positif'),
  })).min(1, 'Minimal 1 item diperlukan'),
  notes: z.string().optional().nullable(),
});

// Category Schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid('Parent kategori tidak valid').optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

// Supplier Schema
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  contact: z.string().min(1, 'Kontak wajib diisi').max(100, 'Kontak maksimal 100 karakter'),
  phone: z.string().min(1, 'Telepon wajib diisi').max(20, 'Telepon maksimal 20 karakter'),
  email: z.string().email('Format email tidak valid').optional().nullable(),
  address: z.string().max(500, 'Alamat maksimal 500 karakter').optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// User Schema
export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  email: z.string().email('Format email tidak valid'),
  password: z.string()
    .min(6, 'Password minimal 6 karakter')
    .regex(/[a-zA-Z]/, 'Password harus mengandung setidaknya satu huruf'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  roleId: z.string().uuid('Role tidak valid'),
});

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string()
    .min(6, 'Password minimal 6 karakter')
    .regex(/[a-zA-Z]/, 'Password harus mengandung setidaknya satu huruf')
    .optional(),
});

// Stock Adjustment Schema
export const createStockAdjustmentSchema = z.object({
  productId: z.string().uuid('Product tidak valid'),
  type: z.enum(['IN', 'OUT'], { errorMap: () => ({ message: 'Tipe harus IN atau OUT' }) }),
  quantity: z.number().int('Quantity harus bilangan bulat').min(1, 'Quantity minimal 1'),
  notes: z.string().optional().nullable(),
});
