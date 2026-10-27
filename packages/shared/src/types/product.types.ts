export interface ProductItem {
  id: number;
  productCode: string;
  productName: string;
  stock: number;
  price: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // snake_case aliases for OpenAPI/client compatibility
  product_code: string;
  product_name: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type Product = ProductItem;

export interface CreateProductInput {
  product_code: string;
  product_name: string;
  stock: number;
  price: number;
  productCode?: string;
  productName?: string;
}

export interface UpdateProductInput {
  product_name?: string;
  stock?: number;
  price?: number;
  productName?: string;
}

export interface ImportSummaryData {
  total_rows: number;
  inserted: number;
  updated: number;
  failed: number;
}

export interface ImportSummaryResponse {
  success: boolean;
  message: string;
  data: ImportSummaryData;
}
