import { z } from 'zod';
import { Role } from '../enums/role.enum';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nama lengkap wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().min(1, 'Email wajib diisi').pipe(z.string().email('Format email tidak valid')),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Pilihan role harus ADMIN atau CASHIER' }),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    new_password_confirmation: z.string().min(8, 'Konfirmasi kata sandi minimal 8 karakter'),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['new_password_confirmation'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
