import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response, Request } from 'express';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ResponseTime');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        if (res && !res.headersSent && typeof res.setHeader === 'function') {
          res.setHeader('X-Response-Time', `${duration}ms`);
        }

        // Slow query / request observability: warn if response takes > 100ms
        if (duration > 100 && req) {
          this.logger.warn(`Slow Request [${req.method}] ${req.originalUrl || req.url} took ${duration}ms`);
        }
      }),
    );
  }
}
