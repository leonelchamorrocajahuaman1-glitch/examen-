import { createServer } from 'node:http';
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
  const server = createServer(app);
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      console.error(`\n❌ No se puede usar el puerto ${config.PORT}: ${err.code === 'EADDRINUSE' ? 'otro programa ya lo está usando' : 'no hay permisos'}.`);
      console.error('   Cambia PORT en server/.env o cierra el programa que lo ocupa.\n');
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  server.listen(config.PORT, () => {
    const url = `http://localhost${config.PORT === 80 ? '' : `:${config.PORT}`}`;
    console.log(`\n⚡ NEON LIQUOR escuchando en ${url}`);
    if (config.isProd) console.log(`   Tienda: ${url}   ·   Panel: ${url}/admin`);
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
