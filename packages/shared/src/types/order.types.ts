import { PaginationMeta } from './pagination-meta.interface';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderItemDetail {
  id: number;
  productId: number;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  // snake_case aliases for OpenAPI/client compatibility
  product_id?: number;
  product_name?: string;
  product_code?: string;
  unit_price?: string | number;
}

export interface OrderActivityLogItem {
  id: number;
  orderId?: number;
  action: string;
  performedBy?: string;
  performedByName?: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  // snake_case aliases
  order_id?: number;
  performed_by?: string;
  performed_by_name?: string;
  created_at?: string;
}

export interface OrderDetailData {
  id: number;
  orderNumber: string;
  customerId: string | null;
  customerName?: string | null;
  createdBy: string;
  createdByName?: string | null;
  cashierName?: string | null;
  orderDate: string;
  totalAmount: string | number;
  items: OrderItemDetail[];
  activityLogs?: OrderActivityLogItem[];
  createdAt?: string;
  updatedAt?: string;
  // snake_case aliases for OpenAPI/client compatibility
  order_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  created_by?: string;
  created_by_name?: string | null;
  order_date?: string;
  total_amount?: string | number;
  activity_logs?: OrderActivityLogItem[];
  created_at?: string;
  updated_at?: string;
}

export type Order = OrderDetailData;

export interface OrderDetailResponse {
  success: boolean;
  data: OrderDetailData;
}

export interface OrderListResponse {
  success: boolean;
  data: OrderDetailData[];
  meta: PaginationMeta;
}

export interface CheckoutItemInput {
  productId?: number;
  product_id?: number;
  quantity: number;
}

export type CreateOrderItemInput = CheckoutItemInput;

export interface CheckoutOrderInput {
  customerId?: string | null;
  customer_id?: string | null;
  items: CheckoutItemInput[];
  amountPaid?: number;
}

export type CreateOrderInput = CheckoutOrderInput;
export type HoldOrderInput = CheckoutOrderInput;

export interface DraftOrderItem {
  productId?: number;
  product_id?: number;
  quantity: number;
}

export interface DraftOrderData {
  id: number;
  userId: string;
  customerId: string | null;
  customerName?: string;
  items: DraftOrderItem[];
  createdAt: string;
  updatedAt?: string;
  // snake_case aliases
  user_id?: string;
  customer_id?: string | null;
  customer_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type DraftOrder = DraftOrderData;
