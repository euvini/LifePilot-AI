import 'dotenv/config';
import { assertSafeTestDatabaseUrl } from './helpers/assert-safe-test-database-url.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL must be set to run e2e tests (see .env.example)',
  );
}

assertSafeTestDatabaseUrl(testDatabaseUrl);
process.env.DATABASE_URL = testDatabaseUrl;
