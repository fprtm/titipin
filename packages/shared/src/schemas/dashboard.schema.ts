import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  period: z.enum(['daily', 'monthly', 'quarterly', 'yearly']).default('monthly'),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
