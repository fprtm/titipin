import { loginSchema, LoginInput } from '@titipin/shared';

export class LoginDto implements LoginInput {
  static readonly schema = loginSchema;
  email!: string;
  password!: string;
}
