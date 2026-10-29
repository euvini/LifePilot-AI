import { describe, expect, it } from 'vitest';
import { throttlerTracker } from './app.module.js';

describe('throttlerTracker', () => {
  it('should ignore X-Forwarded-For header and use the direct connection IP', () => {
    const req = {
      headers: {
        'x-forwarded-for': '198.51.100.254',
      },
      ip: '10.0.0.5',
      socket: {
        remoteAddress: '10.0.0.5',
      },
    };

    expect(throttlerTracker(req)).toBe('10.0.0.5');
  });

  it('should normalize IPv4-mapped IPv6 socket addresses', () => {
    const req = {
      headers: {
        'x-forwarded-for': '198.51.100.99',
      },
      socket: {
        remoteAddress: '::ffff:192.168.1.10',
      },
    };

    expect(throttlerTracker(req)).toBe('192.168.1.10');
  });

  it('should normalize IPv6 loopback and addresses', () => {
    const reqLoopback = {
      ip: '::1',
    };
    expect(throttlerTracker(reqLoopback)).toBe('::1');

    const reqIpv6 = {
      ip: '2001:db8:85a3::8a2e:370:7334',
    };
    expect(throttlerTracker(reqIpv6)).toContain('2001:db8:85a3::/64');
  });

  it('should default to 127.0.0.1 when no IP or socket address is available', () => {
    const reqEmpty = {
      headers: {
        'x-forwarded-for': '198.51.100.1',
      },
    };

    expect(throttlerTracker(reqEmpty)).toBe('127.0.0.1');
  });
});
