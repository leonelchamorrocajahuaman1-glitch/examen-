import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/errors.js';
import { resolveSession } from '../lib/session.js';

/** Carga el usuario de la sesión (si existe) en req.user. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const resolved = await resolveSession(req);
  if (resolved) {
    req.user = resolved.user;
    req.sessionId = resolved.sessionId;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
