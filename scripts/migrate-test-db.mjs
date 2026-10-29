import 'dotenv/config';
import { execSync } from 'node:child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must be set (see .env.example)');
}

let parsed;
try {
  parsed = new URL(testDatabaseUrl);
} catch {
  throw new Error('Invalid TEST_DATABASE_URL');
}

const host = parsed.hostname;
if (host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error(`Refusing to migrate non-local test database host: ${host}`);
}

const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Refusing to migrate database "${databaseName}": name must end with _test`,
  );
}

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
  },
});
