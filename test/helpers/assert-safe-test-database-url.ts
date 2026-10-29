/**
 * Guards destructive test cleanup so it never runs against a non-test DB.
 * Requires a local host and a database name ending with `_test`.
 */
export function assertSafeTestDatabaseUrl(databaseUrl: string): void {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('Invalid test database URL');
  }

  const host = parsed.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `Refusing to use non-local database host for tests: ${host}`,
    );
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!databaseName || databaseName.includes('/')) {
    throw new Error('Test database URL must include a database name');
  }

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to clean database "${databaseName}": name must end with _test`,
    );
  }
}
