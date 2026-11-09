import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as getAuditEventsHandler } from '../../src/audit/get-audit-events';
import { docClient } from '../../src/common/dynamo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

function makeEvent(options: {
  queryStringParameters?: Record<string, string>;
  claims?: Record<string, any>;
}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'GET /v1/audit',
    rawPath: '/v1/audit',
    rawQueryString: '',
    headers: {},
    queryStringParameters: options.queryStringParameters,
    isBase64Encoded: false,
    requestContext: ({
      accountId: '915275802786',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/v1/audit',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest-agent',
      },
      requestId: 'req-audit-test-uuid',
      routeKey: 'GET /v1/audit',
      stage: 'academic',
      time: '09/Nov/2026:03:00:00 +0000',
      timeEpoch: 1794193200000,
      authorizer: options.claims
        ? {
            jwt: {
              claims: options.claims,
              scopes: ['api/audit.read'],
            },
          }
        : undefined,
    } as any),
  };
}

describe('Audit Handler (HU-10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const event = makeEvent({});
    const res = await getAuditEventsHandler(event);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when caller does not have AUDITOR role', async () => {
    const event = makeEvent({
      claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
    });
    const res = await getAuditEventsHandler(event);
    expect(res.statusCode).toBe(403);
  });

  it('returns 200 with queried audit events when eventType is provided', async () => {
    vi.spyOn(docClient, 'send').mockResolvedValueOnce({
      Items: [
        {
          eventId: 'ev-1',
          eventType: 'PROJECT_CREATED',
          timestamp: '2026-11-09T03:00:00.000Z',
          action: 'CREATE_PROJECT',
        },
      ],
    } as any);

    const event = makeEvent({
      claims: { sub: 'auditor-1', 'cognito:groups': 'AUDITOR' },
      queryStringParameters: { eventType: 'PROJECT_CREATED' },
    });
    const res = await getAuditEventsHandler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.count).toBe(1);
    expect(body.data[0].eventType).toBe('PROJECT_CREATED');
  });

  it('returns 200 with scanned audit events when eventType is omitted', async () => {
    vi.spyOn(docClient, 'send').mockResolvedValueOnce({
      Items: [
        {
          eventId: 'ev-2',
          eventType: 'DONATION_INTENTION_CREATED',
          timestamp: '2026-11-09T03:01:00.000Z',
        },
      ],
    } as any);

    const event = makeEvent({
      claims: { sub: 'auditor-1', 'cognito:groups': 'AUDITOR' },
    });
    const res = await getAuditEventsHandler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.count).toBe(1);
  });
});
