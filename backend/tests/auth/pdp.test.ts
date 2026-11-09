import { describe, it, expect } from 'vitest';
import { extractAuthContext, assertRole, assertOwner } from '../../src/auth/pdp';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

function makeMockEvent(claims?: Record<string, any>): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /v1/donations',
    rawPath: '/v1/donations',
    rawQueryString: '',
    headers: {},
    requestContext: ({
      accountId: '915275802786',
      apiId: 'mock-api',
      domainName: 'mock.execute-api.us-east-2.amazonaws.com',
      domainPrefix: 'mock',
      http: {
        method: 'POST',
        path: '/v1/donations',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest-agent',
      },
      requestId: 'req-test-uuid',
      routeKey: 'POST /v1/donations',
      stage: 'academic',
      time: '09/Nov/2026:03:00:00 +0000',
      timeEpoch: 1794193200000,
      authorizer: claims
        ? {
            jwt: {
              claims,
              scopes: ['api/donations.write'],
            },
          }
        : undefined,
    } as any),
    isBase64Encoded: false,
  };
}

describe('Zero Trust PDP - extractAuthContext', () => {
  it('throws 401 UNAUTHORIZED when authorizer claims are missing', () => {
    const event = makeMockEvent(undefined);
    expect(() => extractAuthContext(event)).toThrowError(/Missing or invalid authentication token/);
  });

  it('throws 401 UNAUTHORIZED when claims.sub is missing or empty', () => {
    const event = makeMockEvent({ email: 'test@unsa.edu.pe' });
    expect(() => extractAuthContext(event)).toThrowError(/Missing or invalid authentication token/);
  });

  it('correctly extracts sub and string cognito:groups', () => {
    const event = makeMockEvent({ sub: 'user-uuid-1', 'cognito:groups': 'DONANTE' });
    const auth = extractAuthContext(event);
    expect(auth.sub).toBe('user-uuid-1');
    expect(auth.groups).toEqual(['DONANTE']);
  });

  it('correctly extracts array cognito:groups', () => {
    const event = makeMockEvent({ sub: 'user-uuid-2', 'cognito:groups': ['GESTOR', 'AUDITOR'] });
    const auth = extractAuthContext(event);
    expect(auth.sub).toBe('user-uuid-2');
    expect(auth.groups).toEqual(['GESTOR', 'AUDITOR']);
  });

  it('correctly parses bracketed string cognito:groups "[DONANTE]"', () => {
    const event = makeMockEvent({ sub: 'user-uuid-3', 'cognito:groups': '[DONANTE]' });
    const auth = extractAuthContext(event);
    expect(auth.groups).toEqual(['DONANTE']);
  });

  it('correctly parses comma-separated string cognito:groups "DONANTE, GESTOR"', () => {
    const event = makeMockEvent({ sub: 'user-uuid-4', 'cognito:groups': 'DONANTE, GESTOR' });
    const auth = extractAuthContext(event);
    expect(auth.groups).toEqual(['DONANTE', 'GESTOR']);
  });
});

describe('Zero Trust PDP - assertRole (RBAC & T03 defense)', () => {
  it('permits authorized roles', () => {
    const auth = { sub: 'sub-1', groups: ['DONANTE'] };
    expect(() => assertRole(auth, ['DONANTE'])).not.toThrow();
  });

  it('permits user having one of multiple allowed roles', () => {
    const auth = { sub: 'sub-1', groups: ['GESTOR'] };
    expect(() => assertRole(auth, ['DONANTE', 'GESTOR'])).not.toThrow();
  });

  it('rejects unauthorized roles with 403 FORBIDDEN (T03)', () => {
    const auth = { sub: 'sub-1', groups: ['DONANTE'] };
    expect(() => assertRole(auth, ['GESTOR'])).toThrowError(/se requiere uno de los roles autorizados/);
  });
});

describe('Zero Trust PDP - assertOwner (BOLA & T09 defense)', () => {
  it('permits access when caller is resource owner', () => {
    expect(() => assertOwner('donor-abc', 'donor-abc')).not.toThrow();
  });

  it('rejects access when caller does not match owner (T09)', () => {
    expect(() => assertOwner('donor-abc', 'donor-xyz')).toThrowError(/no es propietario de este recurso/);
  });
});
