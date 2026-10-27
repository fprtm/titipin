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
  revenue: number;
}

export interface SlowMovingProduct {
  productId: number;
  productName: string;
  currentStock: number;
  totalSold: number;
  lastSoldDate: string | null;
}
