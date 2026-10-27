export interface Product {
  id: number;
  productCode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  productCode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface UpdateProductInput {
  productCode?: string;
  name?: string;
  price?: number;
  stock?: number;
  category?: string;
}
