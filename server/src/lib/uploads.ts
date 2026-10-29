import { mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config/env.js';
import { randomToken } from './crypto.js';
import { badRequest } from './errors.js';

mkdirSync(config.uploadDir, { recursive: true });

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
});

/** Detecta el formato real por la firma del archivo (no se confía en la extensión ni en el MIME enviado). */
function detectImage(buf: Buffer): 'jpg' | 'png' | 'webp' | 'avif' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 4, 12) === 'ftypavif') return 'avif';
  return null;
}

export async function saveImage(file: Express.Multer.File) {
  const ext = detectImage(file.buffer);
  if (!ext) throw badRequest('Formato no permitido. Usa JPG, PNG, WEBP o AVIF.');
  const name = `${Date.now().toString(36)}-${randomToken(9)}.${ext}`;
  await writeFile(path.join(config.uploadDir, name), file.buffer);
  return `/uploads/${name}`;
}

export async function removeImage(url: string) {
  if (!url.startsWith('/uploads/')) return;
  const name = path.basename(url);
  await unlink(path.join(config.uploadDir, name)).catch(() => undefined);
}
