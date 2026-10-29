import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';

// Parámetros recomendados por OWASP para argon2id.
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string) {
  return argon2.hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/** Se usa cuando el usuario no existe, para que el tiempo de respuesta no revele qué correos están registrados. */
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword('neon-liquor-dummy-password');
  await verifyPassword(await dummyHash, password);
  return false;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
