/**
 * Handler: POST /v1/projects (HU-08: Create Project Draft)
 * Protected route: Scope api/projects.write + Role GESTOR
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import * as crypto from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';
import { CreateProjectSchema, formatZodError } from '../common/schemas';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'CREATE_PROJECT');

  try {
    // 1. PDP Zero Trust Authorization
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['GESTOR']);

    // 2. Validate request body
    if (!event.body) {
      logger.warn('Empty request body', 400);
      return buildErrorResponse(400, 'BAD_REQUEST', 'El cuerpo de la petición no puede estar vacío', reqId);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(event.body);
    } catch {
      logger.warn('Malformed JSON payload', 400);
      return buildErrorResponse(400, 'BAD_REQUEST', 'El cuerpo de la petición no es un JSON válido', reqId);
    }

    const validation = CreateProjectSchema.safeParse(parsedJson);
    if (!validation.success) {
      const errorMsg = formatZodError(validation.error);
      logger.warn(`Project validation failed: ${errorMsg}`, 400);
      return buildErrorResponse(400, 'BAD_REQUEST', errorMsg, reqId);
    }

    const { title, description, goalAmountCents } = validation.data;
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newProject = {
      projectId,
      title,
      description,
      goalAmountCents,
      confirmedAmountCents: 0,
      currency: 'PEN',
      status: 'BORRADOR',
      createdBy: auth.sub,
      createdAt: now,
      updatedAt: now,
    };

    // 3. Put project draft into DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLES.PROJECTS,
        Item: newProject,
        ConditionExpression: 'attribute_not_exists(projectId)',
      })
    );

    // 4. Record audit event
    const eventId = crypto.randomUUID();
    await docClient.send(
      new PutCommand({
        TableName: TABLES.AUDIT_EVENTS,
        Item: {
          eventType: 'PROJECT_CREATED',
          'timestamp#eventId': `${now}#${eventId}`,
          eventId,
          timestamp: now,
          actorRef: auth.sub,
          resourceRef: projectId,
          action: 'CREATE_PROJECT',
          outcome: 'SUCCESS',
        },
      })
    ).catch((auditErr) => {
      logger.error('Failed to write audit event', 500, auditErr);
    });

    logger.info('Project draft created successfully', 201, projectId, { title, goalAmountCents });
    return buildSuccessResponse(201, {
      data: newProject,
      message: 'Proyecto social registrado exitosamente en estado borrador',
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }

    logger.error('Failed to create project', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al crear el proyecto', reqId);
  }
};
