import { z } from 'zod';
import { Gender } from '../enums/gender.enum';

export const createCustomerSchema = z.object({
  customer_name: z
    .string()
    .min(2, 'Nama pelanggan minimal 2 karakter')
    .max(150, 'Nama pelanggan maksimal 150 karakter')
    .transform((val) => val.trim()),
  customer_address: z
    .string()
    .min(5, 'Alamat minimal 5 karakter')
    .max(255, 'Alamat maksimal 255 karakter')
    .transform((val) => val.trim()),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: 'Pilihan gender harus Pria atau Wanita' }),
  }),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD')
    .nullable()
    .optional(),
  phone: z
    .string()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : val)),
});

export type CreateCustomerSchemaInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  customer_name: z
    .string()
    .min(2, 'Nama pelanggan minimal 2 karakter')
    .max(150, 'Nama pelanggan maksimal 150 karakter')
    .transform((val) => val.trim())
    .optional(),
  customer_address: z
    .string()
    .min(5, 'Alamat minimal 5 karakter')
    .max(255, 'Alamat maksimal 255 karakter')
    .transform((val) => val.trim())
    .optional(),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'Pilihan gender harus Pria atau Wanita' }),
    })
    .optional(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD')
    .nullable()
    .optional(),
  phone: z
    .string()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : val)),
});

export type UpdateCustomerSchemaInput = z.infer<typeof updateCustomerSchema>;

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
