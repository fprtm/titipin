import { Injectable } from '@nestjs/common';
import { AuditLogItem, AuditLogListResponse, AuditQueryInput } from '@titipin/shared';
import { AuditRepository } from '../repositories/audit.repository';

@Injectable()
export class FindAuditLogsUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(query: AuditQueryInput = { page: 1, per_page: 10 }): Promise<AuditLogListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.per_page ?? 10));

    const { items, total } = await this.auditRepository.findAll({
      page,
      perPage,
      userId: query.user_id,
      action: query.action,
      entityType: query.entity_type,
      from: query.from,
      to: query.to,
    });

    const totalPages = Math.ceil(total / perPage);

    const mappedItems: AuditLogItem[] = items.map((item) => {
      const createdAtStr = item.createdAt.toISOString();
      return {
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        payload: (item.payload as Record<string, unknown> | null) ?? null,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: createdAtStr,
        user_id: item.userId,
        user_name: item.userName,
        entity_type: item.entityType,
        entity_id: item.entityId,
        ip_address: item.ipAddress,
        user_agent: item.userAgent,
        created_at: createdAtStr,
      };
    });

    return {
      success: true,
      data: mappedItems,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    };
  }
}
