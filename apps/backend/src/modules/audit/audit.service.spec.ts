import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service';
import type { DrizzleDatabase } from '../../database/database.module';

describe('AuditService', () => {
  let service: AuditService;
  let mockDb: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              userId: 'user-uuid-123',
              action: 'PRODUCT_CREATED',
              entityType: 'products',
              entityId: 'prod-456',
              payload: { before: null, after: { name: 'Test Product' } },
              ipAddress: '127.0.0.1',
              userAgent: 'Vitest/Test',
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    };

    service = new AuditService(mockDb as unknown as DrizzleDatabase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log audit event and insert into database', async () => {
    const result = await service.log({
      userId: 'user-uuid-123',
      action: 'PRODUCT_CREATED',
      entityType: 'products',
      entityId: 'prod-456',
      oldValues: null,
      newValues: { name: 'Test Product' },
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest/Test',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.action).toBe('PRODUCT_CREATED');
  });

  it('should propagate error if database insert fails', async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('DB Connection Failed')),
      }),
    });

    await expect(
      service.log({
        action: 'TEST',
        entityType: 'test',
        entityId: '1',
      }),
    ).rejects.toThrow('DB Connection Failed');
  });
});
