import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { randomToken } from '../lib/crypto.js';
import { HttpError } from '../lib/errors.js';

export const CSRF_COOKIE = 'nl_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function originAllowed(req: Request, origin: string) {
  if (config.allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.host === req.get('host')) return true;
    if (!config.isProd && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return true;
  } catch {
    return false;
  }
  return false;
}

export function ensureCsrfCookie(req: Request, res: Response) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (typeof token !== 'string' || token.length < 20) {
    token = randomToken(24);
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // el frontend debe poder leerlo para enviarlo en la cabecera
      secure: config.COOKIE_SECURE,
      sameSite: 'strict',
      path: '/',
    });
  }
  return token as string;
}

/**
 * Protección CSRF por doble envío: el valor de la cookie nl_csrf debe llegar también
 * en la cabecera X-CSRF-Token. Además se rechazan orígenes desconocidos.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  ensureCsrfCookie(req, res);
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !originAllowed(req, origin)) {
    return next(new HttpError(403, 'Origen no permitido', 'BAD_ORIGIN'));
  }

  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get('x-csrf-token');
  if (typeof cookie !== 'string' || !header || !safeEqual(cookie, header)) {
    return next(new HttpError(403, 'Token de seguridad inválido. Recarga la página e inténtalo otra vez.', 'CSRF'));
  }
  next();
}
