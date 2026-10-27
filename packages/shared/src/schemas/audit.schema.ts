import { z } from 'zod';

export const auditQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
