import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').pipe(z.string().email('Format email tidak valid')),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    new_password: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    new_password_confirmation: z.string().min(1, 'Konfirmasi kata sandi baru wajib diisi'),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['new_password_confirmation'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
