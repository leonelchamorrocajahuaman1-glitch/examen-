import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config/env.js';
import { LEGAL_AGE } from '../config/store.js';
import { hashPassword, randomToken, sha256, verifyAgainstDummy, verifyPassword } from '../lib/crypto.js';
import { badRequest, HttpError, unauthorized } from '../lib/errors.js';
import { passwordResetMail, sendMail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { createSession, destroyAllSessions, destroySession } from '../lib/session.js';
import { ensureCsrfCookie } from '../middleware/csrf.js';
import { parse } from '../middleware/validate.js';
import { ageFrom } from '../services/orders.js';

export const authRouter = Router();

const limiter = (limit: number, windowMinutes: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { message, code: 'RATE_LIMIT' } }),
  });

const loginLimiter = limiter(10, 15, 'Demasiados intentos de inicio de sesión. Espera unos minutos.');
const registerLimiter = limiter(10, 60, 'Demasiados registros desde esta conexión. Inténtalo más tarde.');
const resetLimiter = limiter(5, 60, 'Demasiadas solicitudes. Inténtalo más tarde.');

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

const emailSchema = z
  .email('Correo inválido')
  .max(160)
  .transform((v) => v.trim().toLowerCase());

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()) && d.getUTCFullYear() > 1900, 'Fecha inválida')
  .refine((d) => ageFrom(d) >= LEGAL_AGE, `Debes ser mayor de ${LEGAL_AGE} años para registrarte`);

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Ingresa tu nombre').max(60),
  lastName: z.string().trim().min(2, 'Ingresa tu apellido').max(60),
  email: emailSchema,
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  birthDate: birthDateSchema,
  acceptTerms: z.literal(true, { error: 'Debes aceptar los términos y condiciones' }),
});

export function publicUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  documentId?: string | null;
  birthDate?: Date;
  createdAt?: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    phone: u.phone ?? null,
    documentId: u.documentId ?? null,
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
    createdAt: u.createdAt,
  };
}

authRouter.get('/csrf', (req, res) => {
  res.json({ token: ensureCsrfCookie(req, res) });
});

authRouter.get('/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ user: user ? publicUser(user) : null });
});

authRouter.post('/register', registerLimiter, async (req, res) => {
  const data = parse(registerSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) {
    throw new HttpError(409, 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.', 'EMAIL_TAKEN');
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      birthDate: data.birthDate,
      role: 'CUSTOMER',
    },
  });
  await createSession(req, res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña').max(128),
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  // Mismo mensaje en todos los casos para no revelar qué correos existen.
  if (!user || !valid) throw unauthorized('Correo o contraseña incorrectos');
  if (!user.isActive) throw new HttpError(403, 'Tu cuenta está desactivada. Contáctanos para más información.', 'INACTIVE');

  await createSession(req, res, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

const RESET_TTL_MINUTES = 30;

authRouter.post('/forgot-password', resetLimiter, async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }), req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const token = randomToken(32);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });
    const link = `${config.APP_URL.replace(/\/$/, '')}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    await sendMail({ to: user.email, ...passwordResetMail(user.firstName, link, RESET_TTL_MINUTES) });
  }

  // Respuesta idéntica exista o no la cuenta.
  res.json({
    ok: true,
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  });
});

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

authRouter.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password } = parse(resetSchema, req.body);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('El enlace no es válido o ya expiró. Solicita uno nuevo.');
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);
  // Se cierran todas las sesiones abiertas con la contraseña anterior.
  await destroyAllSessions(record.userId);
  res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});
