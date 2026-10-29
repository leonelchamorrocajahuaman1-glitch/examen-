import { z } from 'zod';
import { badRequest } from '../lib/errors.js';

/** Valida datos de entrada con zod y lanza 400 con los errores por campo. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    throw badRequest('Revisa los datos ingresados', { fields });
  }
  return result.data;
}
