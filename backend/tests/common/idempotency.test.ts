import { describe, it, expect } from 'vitest';
import {
  buildIdempotencyPk,
  computeCanonicalPayloadHash,
} from '../../src/common/idempotency';

describe('Idempotency Hashing & Key Protocol (HU-05, T06, T07)', () => {
  it('formats partition key correctly according to protocol', () => {
    const pk = buildIdempotencyPk('sub-123', 'uuid-abc');
    expect(pk).toBe('sub-123#createDonation#uuid-abc');
  });

  it('produces identical SHA-256 hash regardless of object key order (canonicalization)', () => {
    const hash1 = computeCanonicalPayloadHash({ projectId: 'p1', amountCents: 5000 });
    const hash2 = computeCanonicalPayloadHash({ amountCents: 5000, projectId: 'p1' });
    expect(hash1).toBe(hash2);
  });

  it('produces identical SHA-256 hash regardless of nested object key order (deep canonicalization)', () => {
    const hash1 = computeCanonicalPayloadHash({
      projectId: 'p1',
      metadata: { author: 'Alice', priority: 1 },
    });
    const hash2 = computeCanonicalPayloadHash({
      metadata: { priority: 1, author: 'Alice' },
      projectId: 'p1',
    });
    expect(hash1).toBe(hash2);
  });

  it('produces distinct SHA-256 hash when payload changes (T07 409 conflict detection)', () => {
    const hash1 = computeCanonicalPayloadHash({ projectId: 'p1', amountCents: 5000 });
    const hash2 = computeCanonicalPayloadHash({ projectId: 'p1', amountCents: 6000 });
    expect(hash1).not.toBe(hash2);
  });
});
