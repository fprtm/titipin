import { Gender } from '../enums/gender.enum';
import { PaginationMeta } from './pagination-meta.interface';

export interface CustomerItem {
  id: string;
  customerName: string;
  customerAddress: string;
  gender: Gender;
  birthDate: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // snake_case aliases for OpenAPI/client compatibility
  customer_name?: string;
  customer_address?: string;
  birth_date?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type Customer = CustomerItem;

export interface CreateCustomerInput {
  customer_name: string;
  customer_address: string;
  gender: Gender;
  birth_date: string;
  phone?: string | null;
  // camelCase aliases
  customerName?: string;
  customerAddress?: string;
  birthDate?: string;
}

export interface UpdateCustomerInput {
  customer_name?: string;
  customer_address?: string;
  gender?: Gender;
  birth_date?: string;
  phone?: string | null;
  // camelCase aliases
  customerName?: string;
  customerAddress?: string;
  birthDate?: string;
}

export interface CustomerListResponse {
  success: boolean;
  data: CustomerItem[];
  meta: PaginationMeta;
}

export interface CustomerDetailResponse {
  success: boolean;
  data: CustomerItem;
}
