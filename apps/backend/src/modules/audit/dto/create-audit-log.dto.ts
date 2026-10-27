export interface CreateAuditLogDto {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  payload?: { before?: unknown; after?: unknown };
  ipAddress?: string | null;
  userAgent?: string | null;
}
