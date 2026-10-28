export interface SalesTrendPoint {
  date: string;
  label: string;
  revenue: number;
  transactions: number;
  aov: number;
}

export interface HourlyTrafficItem {
  hour: string;
  transactions: number;
  revenue: number;
  percentage: number;
}

export interface DayOfWeekItem {
  dayName: string;
  dayIndex: number;
  transactions: number;
  revenue: number;
  avgOrderValue: number;
}

export interface ProductAffinityItem {
  productAId: number;
  productAName: string;
  productBId: number;
  productBName: string;
  coOccurrenceCount: number;
  combinedRevenue: number;
  suggestedDiscountPercent: number;
}

export interface CustomerSegmentAnalytics {
  memberOrders: number;
  memberRevenue: number;
  memberAov: number;
  walkInOrders: number;
  walkInRevenue: number;
  walkInAov: number;
  memberRevenueSharePercent: number;
  birthdayDiscountOrdersCount: number;
  birthdayDiscountTotalGiven: number;
}

export interface ActionableInsightItem {
  id: string;
  category: 'BUNDLING' | 'STAFFING' | 'LOYALTY';
  title: string;
  description: string;
  impact: string;
  priority: 'HIGH' | 'MEDIUM';
}

export interface AnalyticsOverviewData {
  period: string;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  peakHour: string;
  topDay: string;
  trend: SalesTrendPoint[];
  hourlyTraffic: HourlyTrafficItem[];
  dayOfWeekTraffic: DayOfWeekItem[];
  bundlingSuggestions: ProductAffinityItem[];
  customerSegmentation: CustomerSegmentAnalytics;
  actionableInsights: ActionableInsightItem[];
}

export interface AnalyticsOverviewResponse {
  success: boolean;
  data: AnalyticsOverviewData;
}
