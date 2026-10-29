import { config } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { purgeExpiredSessions } from './lib/session.js';

async function main() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error('\n❌ No se pudo conectar a PostgreSQL.');
    console.error('   Revisa DATABASE_URL en server/.env y que la base de datos esté encendida');
    console.error('   (con Docker: npm run db:up). Detalle:', (err as Error).message, '\n');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`\n⚡ NEON LIQUOR API escuchando en http://localhost:${config.PORT}`);
    console.log(`   Pagos de prueba: ${config.PAYMENTS_TEST_MODE ? 'ACTIVADOS (sin cobros reales)' : 'desactivados'}`);
    console.log(`   Correo: ${config.smtpEnabled ? `SMTP ${config.SMTP_HOST}` : 'sin SMTP (los correos se muestran en esta consola)'}\n`);
  });

  purgeExpiredSessions().catch(() => undefined);
  const purgeTimer = setInterval(() => purgeExpiredSessions().catch(() => undefined), 60 * 60 * 1000);

  const shutdown = async () => {
    clearInterval(purgeTimer);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
