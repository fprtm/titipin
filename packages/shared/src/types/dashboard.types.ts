export type DashboardPeriod = 'daily' | 'monthly' | 'quarterly' | 'yearly';

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
}

export interface BestSellingProduct {
  productId: number;
  productName: string;
  totalSold: number;
  revenue: number | string;
  // snake_case aliases
  product_id?: number;
  product_name?: string;
  total_sold?: number;
}

export interface SlowMovingProduct {
  productId: number;
  productName: string;
  currentStock?: number;
  totalSold: number;
  lastSoldDate?: string | null;
  // snake_case aliases
  product_id?: number;
  product_name?: string;
  total_sold?: number;
}

export interface LowStockProduct {
  id: number;
  productCode: string;
  productName: string;
  stock: number;
  // snake_case aliases
  product_code?: string;
  product_name?: string;
}

export interface DashboardSummaryData {
  period: DashboardPeriod | string;
  total_transactions: number;
  total_sales_amount: string | number;
  top_products: BestSellingProduct[];
  slow_products: SlowMovingProduct[];
  low_stock_products: LowStockProduct[];
  // camelCase aliases
  totalTransactions?: number;
  totalSalesAmount?: string | number;
  topProducts?: BestSellingProduct[];
  slowProducts?: SlowMovingProduct[];
  lowStockProducts?: LowStockProduct[];
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummaryData;
}

export interface DashboardTrendItem {
  date: string;
  transactions: number;
  revenue: string | number;
  label?: string;
}

export interface DashboardTrendResponse {
  success: boolean;
  data: DashboardTrendItem[];
}
