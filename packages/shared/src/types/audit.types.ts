import { PaginationMeta } from './pagination-meta.interface';

export interface AuditLogItem {
  id: number;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  // snake_case aliases for OpenAPI/client compatibility
  user_id?: string | null;
  user_name?: string | null;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
}

export interface AuditLogListResponse {
  success: boolean;
  data: AuditLogItem[];
  meta: PaginationMeta;
}
