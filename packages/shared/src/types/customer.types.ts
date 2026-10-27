import { Gender } from '../enums/gender.enum';

export interface Customer {
  id: string;
  customerName: string;
  customerAddress: string;
  gender: Gender;
  birthDate: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  customerName: string;
  customerAddress: string;
  gender: Gender;
  birthDate: string;
  phone?: string | null;
}

export interface UpdateCustomerInput {
  customerName?: string;
  customerAddress?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string | null;
}
