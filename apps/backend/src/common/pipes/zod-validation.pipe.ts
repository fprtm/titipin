import { PipeTransform, ArgumentMetadata, UnprocessableEntityException, Injectable } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const targetSchema =
      this.schema ??
      (metadata?.metatype && typeof metadata.metatype === 'function' && 'schema' in metadata.metatype
        ? (metadata.metatype as unknown as { schema: ZodSchema }).schema
        : undefined);

    if (!targetSchema) {
      return value;
    }

    const result = targetSchema.safeParse(value);
    if (!result.success) {
      const formattedErrors = this.formatZodError(result.error);
      throw new UnprocessableEntityException({
        message: 'Validasi gagal',
        errors: formattedErrors,
      });
    }

    return result.data;
  }

  private formatZodError(error: ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    return errors;
  }
}
