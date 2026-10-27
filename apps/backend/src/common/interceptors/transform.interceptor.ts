import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginationMeta } from '@titipin/shared';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(BYPASS_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isBypassed) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          (data as { success: unknown }).success === true
        ) {
          return data;
        }

        let responseMessage: string | undefined;
        let responseData: unknown = data;
        let responseMeta: unknown = undefined;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const dataObject = data as Record<string, unknown>;
          if (typeof dataObject.message === 'string') {
            responseMessage = dataObject.message;
          }
          if (dataObject.meta) {
            responseMeta = dataObject.meta;
          }
          if ('items' in dataObject && dataObject.meta) {
            responseData = dataObject.items;
          } else if ('data' in dataObject) {
            responseData = dataObject.data;
          }
        }

        const formattedResponse: ApiResponse<T> = {
          success: true,
          ...(responseMessage ? { message: responseMessage } : {}),
          data: responseData as T,
          ...(responseMeta ? { meta: responseMeta as PaginationMeta } : {}),
        };

        return formattedResponse;
      }),
    );
  }
}
