export interface Product {
  id: number;
  productCode: string;
  productName: string;
  name?: string;
  price: number;
  stock: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  productCode: string;
  productName: string;
  name?: string;
  price: number;
  stock: number;
  category?: string;
}

export interface UpdateProductInput {
  productCode?: string;
  productName?: string;
  name?: string;
  price?: number;
  stock?: number;
  category?: string;
}
