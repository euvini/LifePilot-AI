import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { buildCorsOptions, parseAllowedOrigins } from './config/cors.config.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableShutdownHooks();

  if (
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY?.toLowerCase() === 'true'
  ) {
    app.set('trust proxy', 1);
  }

  const allowedOrigins = parseAllowedOrigins(
    process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL,
  );
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    logger.warn(
      'CORS_ORIGINS não está definido em produção. Requisições cross-origin de navegadores serão bloqueadas até que CORS_ORIGINS seja configurado.',
    );
  }

  app.enableCors(buildCorsOptions(process.env));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3333;
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
  logger.log(
    `LifePilot API disponível em http://${host}:${port}/api/v1 (ambiente: ${process.env.NODE_ENV ?? 'development'})`,
  );
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const message =
    error instanceof Error
      ? error.message
      : 'Erro inesperado durante a inicialização da API';
  logger.error(`Falha ao iniciar a aplicação: ${message}`);
  process.exit(1);
});
