import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { config } from '../config/env.js';
import { prisma } from './prisma.js';
import { randomToken, sha256 } from './crypto.js';

export const SESSION_COOKIE = 'nl_session';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

const ttlMs = () => config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export async function createSession(req: Request, res: Response, userId: string) {
  // Rotación: si ya había una sesión en este navegador se invalida.
  await destroySession(req, res);

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ttlMs());
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      userAgent: req.get('user-agent')?.slice(0, 255),
      ip: req.ip,
    },
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export async function destroyAllSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function resolveSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
      },
    },
  });
  if (!session) return null;

  if (session.expiresAt < new Date() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  const { isActive: _ignored, ...user } = session.user;
  return { sessionId: session.id, user };
}

export async function purgeExpiredSessions() {
  const now = new Date();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });
}
