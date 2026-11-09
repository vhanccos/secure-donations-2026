import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as listProjectsHandler } from '../../src/projects/list-projects';
import { handler as getProjectHandler } from '../../src/projects/get-project';
import { handler as createProjectHandler } from '../../src/projects/create-project';
import { handler as publishProjectHandler } from '../../src/projects/publish-project';
import { docClient } from '../../src/common/dynamo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

function makeEvent(options: {
  method?: string;
  path?: string;
  rawPath?: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  claims?: Record<string, any>;
}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${options.method || 'GET'} ${options.path || '/v1/projects'}`,
    rawPath: options.rawPath || options.path || '/v1/projects',
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
        method: options.method || 'GET',
        path: options.rawPath || options.path || '/v1/projects',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest-agent',
      },
      requestId: 'req-proj-test-uuid',
      routeKey: `${options.method || 'GET'} ${options.path || '/v1/projects'}`,
      stage: 'academic',
      time: '09/Nov/2026:03:00:00 +0000',
      timeEpoch: 1794193200000,
      authorizer: options.claims
        ? {
            jwt: {
              claims: options.claims,
              scopes: ['api/projects.write'],
            },
          }
        : undefined,
    } as any),
  };
}

describe('Projects Handlers (HU-01, HU-02, HU-08, HU-09)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listProjectsHandler (HU-01, T01)', () => {
    it('returns published projects list with HTTP 200', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Items: [
          {
            projectId: 'proj-1',
            title: 'Comedor Solidario',
            status: 'PUBLICADO',
            goalAmountCents: 500000,
            confirmedAmountCents: 150000,
          },
        ],
      } as any);

      const event = makeEvent({ method: 'GET', path: '/v1/projects' });
      const res = await listProjectsHandler(event);
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body as string);
      expect(body.count).toBe(1);
      expect(body.data[0].status).toBe('PUBLICADO');
    });
  });

  describe('getProjectHandler (HU-02, HU-09)', () => {
    it('returns 400 when projectId path param is missing', async () => {
      const event = makeEvent({ method: 'GET', path: '/v1/projects/{projectId}', pathParameters: {} });
      const res = await getProjectHandler(event);
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when project does not exist', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({ Item: undefined } as any);

      const event = makeEvent({
        method: 'GET',
        path: '/v1/projects/{projectId}',
        pathParameters: { projectId: 'non-existent' },
      });
      const res = await getProjectHandler(event);
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when project is in BORRADOR draft status (Zero Trust privacy)', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: { projectId: 'p-draft', title: 'Draft Project', status: 'BORRADOR' },
      } as any);

      const event = makeEvent({
        method: 'GET',
        path: '/v1/projects/{projectId}',
        pathParameters: { projectId: 'p-draft' },
      });
      const res = await getProjectHandler(event);
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 with project detail when project is PUBLICADO', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: { projectId: 'p-pub', title: 'Published Project', status: 'PUBLICADO' },
      } as any);

      const event = makeEvent({
        method: 'GET',
        path: '/v1/projects/{projectId}',
        pathParameters: { projectId: 'p-pub' },
      });
      const res = await getProjectHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.projectId).toBe('p-pub');
    });

    it('returns 200 with formatted statistics when route is /stats (HU-09)', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValueOnce({
        Item: {
          projectId: 'p-pub',
          status: 'PUBLICADO',
          goalAmountCents: 500000,
          confirmedAmountCents: 150000,
        },
      } as any);

      const event = makeEvent({
        method: 'GET',
        path: '/v1/projects/{projectId}/stats',
        rawPath: '/v1/projects/p-pub/stats',
        pathParameters: { projectId: 'p-pub' },
      });
      const res = await getProjectHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.percentageCompleted).toBe(30);
      expect(body.data.goalAmountFormatted).toBe('S/ 5,000.00');
      expect(body.data.confirmedAmountFormatted).toBe('S/ 1,500.00');
    });
  });

  describe('createProjectHandler (HU-08, T03)', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = makeEvent({ method: 'POST', path: '/v1/projects' });
      const res = await createProjectHandler(event);
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 FORBIDDEN when user has role DONANTE instead of GESTOR (T03)', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/v1/projects',
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
        body: JSON.stringify({
          title: 'Nuevo Proyecto',
          description: 'Descripcion valida para el proyecto.',
          goalAmountCents: 500000,
        }),
      });
      const res = await createProjectHandler(event);
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when payload is invalid', async () => {
      const event = makeEvent({
        method: 'POST',
        path: '/v1/projects',
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
        body: JSON.stringify({ title: 'AB' }), // too short
      });
      const res = await createProjectHandler(event);
      expect(res.statusCode).toBe(400);
    });

    it('returns 201 and creates project draft when caller is GESTOR', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValue({} as any);

      const event = makeEvent({
        method: 'POST',
        path: '/v1/projects',
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
        body: JSON.stringify({
          title: 'Albergue Infantil San Camilo',
          description: 'Comedor popular y apoyo escolar en Alto Selva Alegre.',
          goalAmountCents: 500000,
        }),
      });
      const res = await createProjectHandler(event);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body as string);
      expect(body.data.status).toBe('BORRADOR');
      expect(body.data.createdBy).toBe('gestor-1');
    });
  });

  describe('publishProjectHandler (HU-08)', () => {
    it('returns 403 when caller is not GESTOR', async () => {
      const event = makeEvent({
        method: 'PATCH',
        path: '/v1/projects/{projectId}/publish',
        pathParameters: { projectId: 'p-1' },
        claims: { sub: 'donor-1', 'cognito:groups': 'DONANTE' },
      });
      const res = await publishProjectHandler(event);
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when project does not exist on conditional failure', async () => {
      vi.spyOn(docClient, 'send')
        .mockRejectedValueOnce({ name: 'ConditionalCheckFailedException' })
        .mockResolvedValueOnce({ Item: undefined } as any);

      const event = makeEvent({
        method: 'PATCH',
        path: '/v1/projects/{projectId}/publish',
        pathParameters: { projectId: 'p-nonexistent' },
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
      });
      const res = await publishProjectHandler(event);
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 when project is already published', async () => {
      vi.spyOn(docClient, 'send')
        .mockRejectedValueOnce({ name: 'ConditionalCheckFailedException' })
        .mockResolvedValueOnce({
          Item: { projectId: 'p-already', status: 'PUBLICADO' },
        } as any);

      const event = makeEvent({
        method: 'PATCH',
        path: '/v1/projects/{projectId}/publish',
        pathParameters: { projectId: 'p-already' },
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
      });
      const res = await publishProjectHandler(event);
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body as string);
      expect(body.message).toContain('ya se encuentra publicado');
    });

    it('returns 200 on successful publish transition', async () => {
      vi.spyOn(docClient, 'send').mockResolvedValue({} as any);

      const event = makeEvent({
        method: 'PATCH',
        path: '/v1/projects/{projectId}/publish',
        pathParameters: { projectId: 'p-valid' },
        claims: { sub: 'gestor-1', 'cognito:groups': 'GESTOR' },
      });
      const res = await publishProjectHandler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.status).toBe('PUBLICADO');
    });
  });
});
