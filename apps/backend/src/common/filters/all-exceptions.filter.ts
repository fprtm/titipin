import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '@titipin/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan internal pada server';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Pass through health check status if present
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'database' in (exceptionResponse as Record<string, unknown>)
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        } else if (Array.isArray(responseObj.message)) {
          message = 'Validasi gagal';
          errors = {};
          for (const item of responseObj.message) {
            errors.general = errors.general || [];
            errors.general.push(String(item));
          }
        }

        if (responseObj.errors && typeof responseObj.errors === 'object') {
          errors = responseObj.errors as Record<string, string[]>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = exception.message;
    } else {
      this.logger.error('Unknown exception caught', JSON.stringify(exception));
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    };

    response.status(status).json(errorPayload);
  }
}
