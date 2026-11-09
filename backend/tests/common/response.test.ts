import { describe, it, expect } from 'vitest';
import {
  buildSuccessResponse,
  buildErrorResponse,
  SECURITY_HEADERS,
  HttpError,
} from '../../src/common/response';

describe('Response Helpers & Security Baseline (RNF-HU-01, RNF-HU-11)', () => {
  it('includes all mandatory Zero Trust security headers on success', () => {
    const res = buildSuccessResponse(200, { ok: true });
    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });
    expect(JSON.parse(res.body as string)).toEqual({ ok: true });
  });

  it('builds standard error response format { code, message, requestId }', () => {
    const res = buildErrorResponse(400, 'BAD_REQUEST', 'Validation failed', 'req-xyz-123');
    expect(res.statusCode).toBe(400);
    expect(res.headers).toMatchObject(SECURITY_HEADERS);
    expect(JSON.parse(res.body as string)).toEqual({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      requestId: 'req-xyz-123',
    });
  });

  it('correctly instantiates HttpError with statusCode, code, and message', () => {
    const err = new HttpError(403, 'FORBIDDEN', 'Access denied');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Access denied');
    expect(err.name).toBe('HttpError');
  });
});
