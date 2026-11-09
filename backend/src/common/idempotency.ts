/**
 * Canonical Hashing and Idempotency Key Construction Protocol (HU-05, T06, T07)
 * Hardened recursive JSON canonicalization for deterministic SHA-256 hashes.
 */
import * as crypto from 'node:crypto';

export interface IdempotencyRecord {
  pk: string;
  payloadHash: string;
  donationId: string;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  createdAt: string;
  expiresAt: number;
}

/**
 * Builds the composite partition key scoped by user and operation.
 * Format: `${donorSub}#createDonation#${idempotencyKey}`
 */
export function buildIdempotencyPk(donorSub: string, idempotencyKey: string): string {
  return `${donorSub}#createDonation#${idempotencyKey}`;
}

/**
 * Recursively sorts object keys to produce deterministic canonical JSON structures.
 * Supports nested objects and arrays of objects.
 */
function canonicalizePayload(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizePayload);
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizePayload(obj[key]);
  }
  return result;
}

/**
 * Canonicalizes payload by recursively sorting keys to ensure deterministic SHA-256 hashes.
 */
export function computeCanonicalPayloadHash(payload: Record<string, unknown>): string {
  const canonicalObj = canonicalizePayload(payload);
  const canonicalString = JSON.stringify(canonicalObj);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
