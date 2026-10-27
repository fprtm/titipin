import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDatabase, DrizzleClient } from '../../../database/database.module';
import * as schema from '../../../database/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase) {}

  private getClient(tx?: DrizzleClient): DrizzleClient {
    return tx ?? this.db;
  }

  async findAll(tx?: DrizzleClient): Promise<(typeof schema.users.$inferSelect)[]> {
    return this.getClient(tx)
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));
  }

  async findById(id: string, tx?: DrizzleClient): Promise<typeof schema.users.$inferSelect | null> {
    const [user] = await this.getClient(tx)
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string, tx?: DrizzleClient): Promise<typeof schema.users.$inferSelect | null> {
    const [user] = await this.getClient(tx)
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);

    return user ?? null;
  }

  async create(
    data: typeof schema.users.$inferInsert,
    tx?: DrizzleClient,
  ): Promise<typeof schema.users.$inferSelect> {
    const [newUser] = await this.getClient(tx)
      .insert(schema.users)
      .values(data)
      .returning();

    return newUser;
  }

  async update(
    id: string,
    data: Partial<typeof schema.users.$inferInsert>,
    tx?: DrizzleClient,
  ): Promise<typeof schema.users.$inferSelect | null> {
    const [updated] = await this.getClient(tx)
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    return updated ?? null;
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
    tx?: DrizzleClient,
  ): Promise<void> {
    await this.getClient(tx)
      .update(schema.users)
      .set({
        refreshTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));
  }

  async updatePassword(
    id: string,
    passwordHash: string,
    tx?: DrizzleClient,
  ): Promise<void> {
    await this.getClient(tx)
      .update(schema.users)
      .set({
        password: passwordHash,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));
  }

  async deactivate(id: string, tx?: DrizzleClient): Promise<void> {
    await this.getClient(tx)
      .update(schema.users)
      .set({
        deletedAt: new Date(),
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));
  }
}
