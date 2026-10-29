import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { HttpError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Ruta no encontrada', code: 'NOT_FOUND' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { message: err.message, code: err.code, details: err.details } });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el tamaño máximo (5 MB)' : 'Archivo no válido';
    return res.status(400).json({ error: { message, code: err.code } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      return res.status(409).json({
        error: { message: `Ya existe un registro con ese valor${target ? ` (${target})` : ''}`, code: 'DUPLICATE' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Recurso no encontrado', code: 'NOT_FOUND' } });
    }
    if (err.code === 'P2003') {
      return res
        .status(409)
        .json({ error: { message: 'El registro está en uso y no se puede eliminar', code: 'IN_USE' } });
    }
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: { message: 'JSON inválido', code: 'BAD_JSON' } });
  }

  console.error('[error]', err);
  res.status(500).json({ error: { message: 'Error interno del servidor', code: 'INTERNAL' } });
}
