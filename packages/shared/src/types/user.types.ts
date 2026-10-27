import { Role } from '../enums/role.enum';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  // Aliases for openapi snake_case compatibility
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type UserProfile = UserItem;

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponseData {
  accessToken: string;
  access_token: string;
  user: UserItem;
}

export interface RefreshResponseData {
  accessToken: string;
  access_token: string;
}

export interface AuthTokens {
  accessToken: string;
  access_token?: string;
  user: UserItem;
}

export interface ChangePasswordInput {
  current_password?: string;
  new_password?: string;
  new_password_confirmation?: string;
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirmation?: string;
}

export interface UpdateProfileInput {
  name: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  iat?: number;
  exp?: number;
}
