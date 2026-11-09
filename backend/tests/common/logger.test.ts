import { describe, it, expect } from 'vitest';
import { sanitize } from '../../src/common/logger';

describe('StructuredLogger Secret Redaction (RNF-HU-07)', () => {
  it('redacts sensitive keys regardless of case', () => {
    const raw = {
      Authorization: 'Bearer eyJhbGciOi...',
      password: 'SuperSecretPassword123!',
      token: 'sensitive-token',
      cvv: '123',
      cardNumber: '4111222233334444',
      normalField: 'safeValue',
    };

    const sanitized = sanitize(raw) as Record<string, unknown>;
    expect(sanitized.Authorization).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.cvv).toBe('[REDACTED]');
    expect(sanitized.cardNumber).toBe('[REDACTED]');
    expect(sanitized.normalField).toBe('safeValue');
  });

  it('redacts Bearer tokens in string values', () => {
    const text = 'Invoked with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
    const sanitized = sanitize(text);
    expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('redacts credit card numbers in string values', () => {
    const text = 'Customer entered card 4111-2222-3333-4444 during error';
    const sanitized = sanitize(text);
    expect(sanitized).toBe('Customer entered card [REDACTED_CARD] during error');
  });

  it('handles circular references gracefully without stack overflow', () => {
    const obj: Record<string, unknown> = { name: 'circular' };
    obj.self = obj;

    const sanitized = sanitize(obj) as Record<string, unknown>;
    expect(sanitized.name).toBe('circular');
    expect(sanitized.self).toBe('[CIRCULAR_REFERENCE]');
  });
});
