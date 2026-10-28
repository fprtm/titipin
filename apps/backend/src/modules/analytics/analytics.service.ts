import { Injectable } from '@nestjs/common';
import {
  DashboardPeriod,
  AnalyticsOverviewData,
  ActionableInsightItem,
  SalesTrendPoint,
  HourlyTrafficItem,
  DayOfWeekItem,
  ProductAffinityItem,
  CustomerSegmentAnalytics,
} from '@titipin/shared';
import { AnalyticsRepository } from './repositories/analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getOverview(period: DashboardPeriod = 'monthly'): Promise<AnalyticsOverviewData> {
    const [
      trend,
      hourlyTraffic,
      dayOfWeekTraffic,
      bundlingSuggestions,
      customerSegmentation,
    ] = await Promise.all([
      this.analyticsRepository.getTrendPoints(period),
      this.analyticsRepository.getHourlyTraffic(period),
      this.analyticsRepository.getDayOfWeekTraffic(period),
      this.analyticsRepository.getProductAffinityPairs(5),
      this.analyticsRepository.getCustomerSegmentAnalytics(period),
    ]);

    const totalRevenue = trend.reduce((sum, t) => sum + t.revenue, 0);
    const totalTransactions = trend.reduce((sum, t) => sum + t.transactions, 0);
    const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Find peak hour
    let peakHour = '-';
    let maxHourTx = 0;
    for (const h of hourlyTraffic) {
      if (h.transactions > maxHourTx) {
        maxHourTx = h.transactions;
        peakHour = `Pukul ${h.hour}`;
      }
    }

    // Find top revenue day of week
    let topDay = '-';
    let maxDayRev = 0;
    for (const d of dayOfWeekTraffic) {
      if (d.revenue > maxDayRev) {
        maxDayRev = d.revenue;
        topDay = d.dayName;
      }
    }

    // Generate Dynamic Actionable Business Insights
    const actionableInsights: ActionableInsightItem[] = [];

    // 1. Bundling Promotion Insight
    if (bundlingSuggestions.length > 0) {
      const topPair = bundlingSuggestions[0];
      actionableInsights.push({
        id: 'insight-bundling-1',
        category: 'BUNDLING',
        title: `Paket Hemat: ${topPair.productAName} + ${topPair.productBName}`,
        description: `Kedua produk ini telah dibeli bersamaan sebanyak ${topPair.coOccurrenceCount} kali. Luncurkan paket hemat bundling dengan diskon ${topPair.suggestedDiscountPercent}% untuk menaikkan unit penjualan keranjang.`,
        impact: `Potensi kenaikan AOV hingga +12% dari cross-selling terbukti.`,
        priority: 'HIGH',
      });
    }

    // 2. Staffing & Rush Hours Optimization
    if (peakHour !== '-') {
      actionableInsights.push({
        id: 'insight-staffing-1',
        category: 'STAFFING',
        title: `Antisipasi Lonjakan Transaksi pada ${peakHour}`,
        description: `Volume transaksi paling padat terkonsentrasi pada ${peakHour}. Pastikan minimal 2 kasir aktif dan stok produk cepat saji siap di etalase depan.`,
        impact: `Mengurangi waktu antrean kasir hingga 40% dan mencegah pelanggan batal antre.`,
        priority: 'HIGH',
      });
    }

    // 3. Customer Loyalty Conversion
    if (customerSegmentation.walkInOrders > 0 && customerSegmentation.memberAov > customerSegmentation.walkInAov) {
      const aovMultiplier = Math.round((customerSegmentation.memberAov / customerSegmentation.walkInAov) * 10) / 10;
      actionableInsights.push({
        id: 'insight-loyalty-1',
        category: 'LOYALTY',
        title: `Peluang Konversi Pelanggan Member (AOV ${aovMultiplier}x Lebih Tinggi)`,
        description: `Rata-rata belanja Member (Rp ${customerSegmentation.memberAov.toLocaleString('id-ID')}) jauh lebih tinggi dibanding Pelanggan Umum (Rp ${customerSegmentation.walkInAov.toLocaleString('id-ID')}). Berikan insentif kepada kasir untuk mengajak pelanggan mendaftar member.`,
        impact: `Potensi peningkatan omset harian hingga +25% bila 30% pelanggan umum beralih ke member.`,
        priority: 'MEDIUM',
      });
    }

    return {
      period,
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      peakHour,
      topDay,
      trend,
      hourlyTraffic,
      dayOfWeekTraffic,
      bundlingSuggestions,
      customerSegmentation,
      actionableInsights,
    };
  }

  async getTrend(period: DashboardPeriod): Promise<SalesTrendPoint[]> {
    return this.analyticsRepository.getTrendPoints(period);
  }

  async getPeakHours(period: DashboardPeriod): Promise<{ hourly: HourlyTrafficItem[]; dayOfWeek: DayOfWeekItem[] }> {
    const [hourly, dayOfWeek] = await Promise.all([
      this.analyticsRepository.getHourlyTraffic(period),
      this.analyticsRepository.getDayOfWeekTraffic(period),
    ]);
    return { hourly, dayOfWeek };
  }

  async getBundlingSuggestions(): Promise<ProductAffinityItem[]> {
    return this.analyticsRepository.getProductAffinityPairs(5);
  }

  async getCustomerSegments(period: DashboardPeriod): Promise<CustomerSegmentAnalytics> {
    return this.analyticsRepository.getCustomerSegmentAnalytics(period);
  }
}
