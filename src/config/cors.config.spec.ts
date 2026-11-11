import { describe, expect, it } from 'vitest';
import { buildCorsOptions, parseAllowedOrigins } from './cors.config.js';

describe('cors.config', () => {
  describe('parseAllowedOrigins', () => {
    it('parses comma-separated origins, trimming whitespace and trailing slashes', () => {
      const result = parseAllowedOrigins(
        ' https://lifepilot.vercel.app/ , http://localhost:3000/ , ',
      );

      expect(result).toEqual([
        'https://lifepilot.vercel.app',
        'http://localhost:3000',
      ]);
    });

    it('ignores wildcard (*) entries and empty strings', () => {
      expect(parseAllowedOrigins('*')).toEqual([]);
      expect(parseAllowedOrigins('')).toEqual([]);
      expect(parseAllowedOrigins(undefined)).toEqual([]);
    });
  });

  describe('buildCorsOptions', () => {
    it('allows only configured origins when CORS_ORIGINS is provided', () => {
      const options = buildCorsOptions({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://lifepilot.vercel.app,http://localhost:3000/',
      });

      expect(options.credentials).toBe(true);
      expect(options.allowedHeaders).toContain('Authorization');
      expect(options.methods).toContain('DELETE');

      const originFn = options.origin as (
        origin: string | undefined,
        cb: (err: Error | null, allow?: boolean) => void,
      ) => void;

      let allowed: boolean | undefined;
      originFn('https://lifepilot.vercel.app', (_err, allow) => {
        allowed = allow;
      });
      expect(allowed).toBe(true);

      originFn('https://lifepilot.vercel.app/', (_err, allow) => {
        allowed = allow;
      });
      expect(allowed).toBe(true);

      originFn('https://malicious.example.com', (_err, allow) => {
        allowed = allow;
      });
      expect(allowed).toBe(false);

      originFn(undefined, (_err, allow) => {
        allowed = allow;
      });
      expect(allowed).toBe(true);
    });

    it('disables cross-origin access in production when CORS_ORIGINS is missing', () => {
      const options = buildCorsOptions({
        NODE_ENV: 'production',
      });

      expect(options.origin).toBe(false);
    });

    it('allows origins in local development when CORS_ORIGINS is not set', () => {
      const options = buildCorsOptions({
        NODE_ENV: 'development',
      });

      expect(options.origin).toBe(true);
    });
  });
});
