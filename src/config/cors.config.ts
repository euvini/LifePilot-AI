import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export function parseAllowedOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins || typeof rawOrigins !== 'string') {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0 && origin !== '*');
}

export function buildCorsOptions(
  env: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  const rawOrigins = env.CORS_ORIGINS ?? env.FRONTEND_URL;
  const allowedOrigins = parseAllowedOrigins(rawOrigins);
  const isProduction = env.NODE_ENV === 'production';

  const baseOptions: Omit<CorsOptions, 'origin'> = {
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  };

  if (allowedOrigins.length > 0) {
    return {
      ...baseOptions,
      origin: (
        requestOrigin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!requestOrigin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = requestOrigin.trim().replace(/\/+$/, '');
        if (allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
    };
  }

  return {
    ...baseOptions,
    origin: isProduction ? false : true,
  };
}
