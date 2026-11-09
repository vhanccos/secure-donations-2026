import { describe, it, expect } from 'vitest';
import { getHeader } from '../../src/common/headers';

describe('Case-Insensitive HTTP Header Extraction (RFC 7230, getHeader)', () => {
  it('extracts header when key has exact PascalCase casing (Idempotency-Key)', () => {
    const headers = { 'Idempotency-Key': 'key-pascal' };
    expect(getHeader(headers, 'Idempotency-Key')).toBe('key-pascal');
  });

  it('extracts header when key is lowercase (idempotency-key) via target PascalCase', () => {
    const headers = { 'idempotency-key': 'key-lower' };
    expect(getHeader(headers, 'Idempotency-Key')).toBe('key-lower');
  });

  it('extracts header when key is uppercase (IDEMPOTENCY-KEY)', () => {
    const headers = { 'IDEMPOTENCY-KEY': 'key-upper' };
    expect(getHeader(headers, 'Idempotency-Key')).toBe('key-upper');
  });

  it('extracts header when key has mixed casing (iDeMpOtEnCy-kEy)', () => {
    const headers = { 'iDeMpOtEnCy-kEy': 'key-mixed' };
    expect(getHeader(headers, 'Idempotency-Key')).toBe('key-mixed');
  });

  it('tolerates whitespace in search query', () => {
    const headers = { 'idempotency-key': 'key-trimmed' };
    expect(getHeader(headers, '  Idempotency-Key  ')).toBe('key-trimmed');
  });

  it('returns undefined when target header is not present', () => {
    const headers = { authorization: 'Bearer xyz', 'content-type': 'application/json' };
    expect(getHeader(headers, 'Idempotency-Key')).toBeUndefined();
  });

  it('returns undefined gracefully when headers map is undefined or null', () => {
    expect(getHeader(undefined, 'Idempotency-Key')).toBeUndefined();
    expect(getHeader(null, 'Idempotency-Key')).toBeUndefined();
  });

  it('returns undefined when headers map is empty object', () => {
    expect(getHeader({}, 'Idempotency-Key')).toBeUndefined();
  });
});
