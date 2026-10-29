import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const isProd = process.env.NODE_ENV === 'production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio (ver server/.env.example)'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  COOKIE_SECURE: bool(isProd),
  TRUST_PROXY: bool(false),
  UPLOAD_DIR: z.string().default('uploads'),

  PAYMENTS_TEST_MODE: bool(!isProd),
  CASH_ON_DELIVERY_ENABLED: bool(true),
  BANK_TRANSFER_INFO: z.string().optional(),

  FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().min(0).default(25000),
  SHIPPING_STANDARD_CENTS: z.coerce.number().int().min(0).default(1500),
  SHIPPING_EXPRESS_CENTS: z.coerce.number().int().min(0).default(2990),

  STORE_EMAIL: z.string().default('contacto@neonliquor.example'),
  STORE_PHONE: z.string().default('+51 900 000 000'),
  STORE_ADDRESS: z.string().default('Dirección de ejemplo — configúrala en server/.env'),
  STORE_HOURS: z.string().default('Lun a Dom · 10:00 – 23:00'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('NEON LIQUOR <no-reply@neonliquor.example>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('\n❌ Configuración inválida en server/.env:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('   Copia server/.env.example a server/.env y revisa los valores.\n');
  process.exit(1);
}

const env = parsed.data;

export const config = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  uploadDir: path.resolve(process.cwd(), env.UPLOAD_DIR),
  allowedOrigins: [
    env.APP_URL,
    ...(env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ].map((o) => o.replace(/\/$/, '')),
  smtpEnabled: Boolean(env.SMTP_HOST),
};
