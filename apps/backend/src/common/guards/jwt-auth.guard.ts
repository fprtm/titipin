import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envConfig } from '../../config/env.config';
import { DRIZZLE_ORM, DrizzleDatabase } from '../../database/database.module';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';
import { JwtPayload } from '@titipin/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token akses tidak ditemukan atau format tidak valid');
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: envConfig.JWT_SECRET,
      });

      // Check if user exists and is active
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.sub))
        .limit(1);

      if (!user || user.deletedAt !== null) {
        throw new UnauthorizedException('Pengguna tidak ditemukan atau telah dinonaktifkan');
      }

      request.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        deletedAt: null,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token akses tidak valid atau telah kadaluarsa');
    }
  }
}
