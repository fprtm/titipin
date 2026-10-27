import { changePasswordSchema } from '@titipin/shared';

export class ChangePasswordDto {
  static readonly schema = changePasswordSchema;
  current_password!: string;
  new_password!: string;
  new_password_confirmation!: string;
}
