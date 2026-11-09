import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as createDonationHandler } from '../../src/donations/create-donation';
import { handler as simulateDonationHandler } from '../../src/donations/simulate-donation';
import { handler as getMyDonationsHandler } from '../../src/donations/get-my-donations';
import { docClient } from '../../src/common/dynamo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { computeCanonicalPayloadHash } from '../../src/common/idempotency';

function makeEvent(options: {
  method?: string;
  path?: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  claims?: Record<string, any>;
}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${options.method || 'POST'} ${options.path || '/v1/donations'}`,
    rawPath: options.path || '/v1/donations',
    rawQueryString: '',
    headers: options.headers || {},
    queryStringParameters: options.queryStringParameters,
    pathParameters: options.pathParameters,
    body: options.body,
    isBase64Encoded: false,
    requestContext: ({
      accountId: '915275802786',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: options.method || 'POST',
        path: options.path || '/v1/donations',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest-agent',
      },
      requestId: 'req-don-test-uuid',
      routeKey: `${options.method || 'POST'} ${options.path || '/v1/donations'}`,
      stage: 'academic',
      time: '09/Nov/2026:03:00:00 +0000',
      timeEpoch: 1794193200000,
      authorizer: options.claims
        ? {
            jwt: {
              claims: options.claims,
              scopes: ['api/donations.write', 'api/donations.read'],
            },
          }
        : undefined,
    } as any),
  };
}

describe('Donations Handlers (HU-05, HU-06, HU-07, T04, T05, T06, T07, T08, T09, T12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.STAGE = 'academic';
  });

  describe('createDonationHandler (HU-05, T04, T05, T06, T07)', () => {
    const validKey = '123e4567-e89b-12d3-a456-426614174000';

    it('returns 401 when unauthenticated', async () => {
      const event = makeEvent({});
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller is not DONANTE', async () => {
      const event = makeEvent({
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when Idempotency-Key header is missing', async () => {
      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body as string).message).toContain('Idempotency-Key');
    });

    it('returns 400 when Idempotency-Key header is not a valid UUID (T04)', async () => {
      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': 'not-a-uuid-key' },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when amountCents is out of bounds (T04)', async () => {
      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 50 }), // < 100
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when target project does not exist', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({ Item: undefined } as any);

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'non-existent', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body as string).code).toBe('NOT_FOUND');
    });

    it('returns 409 when target project is not PUBLICADO (BORRADOR draft)', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: { projectId: 'draft-p', status: 'BORRADOR' },
      } as any);

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'draft-p', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body as string).message).toContain('no está publicado');
    });

    it('returns 201 on initial successful donation creation (T05)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({ Item: { projectId: 'proj-1', status: 'PUBLICADO' } } as any) // GetCommand
        .mockResolvedValueOnce({} as any) // TransactWriteCommand
        .mockResolvedValueOnce({} as any); // PutCommand (audit)

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body as string);
      expect(body.data.status).toBe('PENDIENTE_SIMULACION');
      expect(body.data.amountCents).toBe(5000);
      expect(body.data.amountFormatted).toBe('S/ 50.00');
    });

    it('accepts Idempotency-Key header with uppercase casing (IDEMPOTENCY-KEY)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({ Item: { projectId: 'proj-1', status: 'PUBLICADO' } } as any)
        .mockResolvedValueOnce({} as any)
        .mockResolvedValueOnce({} as any);

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'IDEMPOTENCY-KEY': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(201);
    });

    it('accepts Idempotency-Key header with PascalCase casing (Idempotency-Key)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({ Item: { projectId: 'proj-1', status: 'PUBLICADO' } } as any)
        .mockResolvedValueOnce({} as any)
        .mockResolvedValueOnce({} as any);

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'Idempotency-Key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(201);
    });

    it('returns cached 201 response when replaying identical key and payload (T06)', async () => {
      const payloadHash = computeCanonicalPayloadHash({ projectId: 'proj-1', amountCents: 5000 });
      const cachedResponseBody = {
        message: 'Intención de donación registrada en modo simulación académica',
        data: { donationId: 'cached-don-id', status: 'PENDIENTE_SIMULACION', amountCents: 5000 },
      };

      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({ Item: { projectId: 'proj-1', status: 'PUBLICADO' } } as any) // Get project
        .mockRejectedValueOnce({ name: 'TransactionCanceledException' }) // TransactWrite fails
        .mockResolvedValueOnce({
          Item: {
            pk: 'donor-1#createDonation#' + validKey,
            payloadHash,
            responseStatus: 201,
            responseBody: cachedResponseBody,
          },
        } as any); // Get idempotency record

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 5000 }),
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body as string);
      expect(body.data.donationId).toBe('cached-don-id');
    });

    it('returns 409 CONFLICT when reusing key with different payload (T07)', async () => {
      const originalHash = computeCanonicalPayloadHash({ projectId: 'proj-1', amountCents: 5000 });

      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({ Item: { projectId: 'proj-1', status: 'PUBLICADO' } } as any) // Get project
        .mockRejectedValueOnce({ name: 'TransactionCanceledException' }) // TransactWrite fails
        .mockResolvedValueOnce({
          Item: {
            pk: 'donor-1#createDonation#' + validKey,
            payloadHash: originalHash,
            responseStatus: 201,
            responseBody: {},
          },
        } as any); // Get idempotency record (hash mismatch!)

      const event = makeEvent({
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        headers: { 'idempotency-key': validKey },
        body: JSON.stringify({ projectId: 'proj-1', amountCents: 8000 }), // Different amount!
      });
      const res = await createDonationHandler(event);
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body as string).code).toBe('CONFLICT');
    });
  });

  describe('simulateDonationHandler (HU-06, T08, T09)', () => {
    const validDonationId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

    it('returns 403 when stage is not academic', async () => {
      process.env.STAGE = 'prod';
      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when donationId is invalid UUID', async () => {
      const event = makeEvent({
        pathParameters: { donationId: 'not-a-valid-uuid' },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when donation is not found', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({ Item: undefined } as any);

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(404);
    });

    it('returns 403 FORBIDDEN when user attempts to simulate donation owned by another user (BOLA T09 defense)', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: {
          donationId: validDonationId,
          donorSub: 'donor-victim',
          status: 'PENDIENTE_SIMULACION',
          amountCents: 5000,
        },
      } as any);

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-attacker', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body as string).code).toBe('FORBIDDEN');
    });

    it('returns 409 CONFLICT when donation is not in PENDIENTE_SIMULACION', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: {
          donationId: validDonationId,
          donorSub: 'donor-1',
          status: 'CONFIRMADA_SIMULADA',
          amountCents: 5000,
        },
      } as any);

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(409);
    });

    it('returns 200 and confirms simulation (CONFIRMADA_SIMULADA)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({
          Item: {
            donationId: validDonationId,
            donorSub: 'donor-1',
            projectId: 'proj-1',
            status: 'PENDIENTE_SIMULACION',
            amountCents: 5000,
          },
        } as any) // Get donation
        .mockResolvedValueOnce({} as any) // TransactWriteCommand
        .mockResolvedValueOnce({} as any); // Audit event

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        body: JSON.stringify({ action: 'CONFIRMAR' }),
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.status).toBe('CONFIRMADA_SIMULADA');
    });

    it('returns 200 and rejects simulation without altering project (RECHAZADA_SIMULADA)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({
          Item: {
            donationId: validDonationId,
            donorSub: 'donor-1',
            projectId: 'proj-1',
            status: 'PENDIENTE_SIMULACION',
            amountCents: 5000,
          },
        } as any)
        .mockResolvedValueOnce({} as any)
        .mockResolvedValueOnce({} as any);

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        body: JSON.stringify({ action: 'RECHAZAR' }),
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.status).toBe('RECHAZADA_SIMULADA');
    });

    it('handles concurrent race conditions gracefully returning 409 (T08 defense)', async () => {
      vi.spyOn(docClient, 'send')
        .mockResolvedValueOnce({
          Item: {
            donationId: validDonationId,
            donorSub: 'donor-1',
            projectId: 'proj-1',
            status: 'PENDIENTE_SIMULACION',
            amountCents: 5000,
          },
        } as any)
        .mockRejectedValueOnce({ name: 'TransactionCanceledException' });

      const event = makeEvent({
        pathParameters: { donationId: validDonationId },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await simulateDonationHandler(event);
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body as string).code).toBe('CONFLICT');
    });
  });

  describe('getMyDonationsHandler (HU-07, T12)', () => {
    it('returns 403 when called by GESTOR role (T12 defense)', async () => {
      const event = makeEvent({
        method: 'GET',
        path: '/v1/donations/me',
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
      });
      const res = await getMyDonationsHandler(event);
      expect(res.statusCode).toBe(403);
    });

    it('returns 200 with caller personal donations list', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Items: [
          {
            donationId: 'don-1',
            donorSub: 'donor-1',
            projectId: 'proj-1',
            amountCents: 5000,
            status: 'CONFIRMADA_SIMULADA',
          },
        ],
      } as any);

      const event = makeEvent({
        method: 'GET',
        path: '/v1/donations/me',
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await getMyDonationsHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.count).toBe(1);
      expect(body.donorSub).toBe('donor-1');
    });
  });
});
