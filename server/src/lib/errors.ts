export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = 'Debes iniciar sesión') =>
  new HttpError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'No tienes permiso para esta acción') =>
  new HttpError(403, message, 'FORBIDDEN');
export const notFound = (message = 'Recurso no encontrado') =>
  new HttpError(404, message, 'NOT_FOUND');
export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, message, 'CONFLICT', details);
