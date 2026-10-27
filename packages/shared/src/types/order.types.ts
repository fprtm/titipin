export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: string | null;
  customerName?: string | null;
  createdBy: string;
  cashierName?: string;
  orderDate: string;
  totalAmount: number;
  items?: OrderItem[];
  createdAt: string;
}

export interface CheckoutItemInput {
  productId: number;
  quantity: number;
}

export interface CheckoutOrderInput {
  customerId?: string | null;
  items: CheckoutItemInput[];
  amountPaid: number;
}

export interface DraftOrder {
  id: number;
  userId: string;
  customerId: string | null;
  items: CheckoutItemInput[];
  createdAt: string;
  updatedAt: string;
}
