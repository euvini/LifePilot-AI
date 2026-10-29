import { assertSafeTestDatabaseUrl } from './assert-safe-test-database-url.js';

describe('assertSafeTestDatabaseUrl', () => {
  it('accepts a local database whose name ends with _test', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://lifepilot:lifepilot@localhost:5432/lifepilot_test?schema=public',
      ),
    ).not.toThrow();
  });

  it('rejects a local non-test database name', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://lifepilot:lifepilot@localhost:5432/lifepilot?schema=public',
      ),
    ).toThrow(/must end with _test/);
  });

  it('rejects a non-local host', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://lifepilot:lifepilot@db.example.com:5432/lifepilot_test?schema=public',
      ),
    ).toThrow(/non-local database host/);
  });
});
