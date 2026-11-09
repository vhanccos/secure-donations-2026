/**
 * Handler: PATCH /v1/projects/{projectId}/publish (HU-08: Publish Project)
 * Protected route: Scope api/projects.write + Role GESTOR
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import * as crypto from 'node:crypto';
import { UpdateCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'PUBLISH_PROJECT');

  try {
    // 1. PDP Zero Trust Authorization
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['GESTOR']);

    const projectId = event.pathParameters?.projectId;
    if (!projectId || projectId.trim() === '') {
      logger.warn('Missing projectId in path parameter', 400);
      return buildErrorResponse(400, 'BAD_REQUEST', 'El parámetro projectId es requerido', reqId);
    }

    const cleanProjectId = projectId.trim();
    const now = new Date().toISOString();

    // 2. Conditional Update
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.PROJECTS,
          Key: { projectId: cleanProjectId },
          ConditionExpression: 'attribute_exists(projectId) AND #st = :borrador',
          UpdateExpression: 'SET #st = :publicado, #upd = :updatedAt, #pubBy = :publishedBy',
          ExpressionAttributeNames: {
            '#st': 'status',
            '#upd': 'updatedAt',
            '#pubBy': 'publishedBy',
          },
          ExpressionAttributeValues: {
            ':borrador': 'BORRADOR',
            ':publicado': 'PUBLICADO',
            ':updatedAt': now,
            ':publishedBy': auth.sub,
          },
        })
      );
    } catch (updateErr: unknown) {
      const isCondFailed =
        updateErr instanceof ConditionalCheckFailedException ||
        (typeof updateErr === 'object' &&
          updateErr !== null &&
          (updateErr as { name?: string }).name === 'ConditionalCheckFailedException');

      if (isCondFailed) {
        // Distinguish 404 (does not exist) vs 409 (already published / wrong state)
        const existing = await docClient.send(
          new GetCommand({
            TableName: TABLES.PROJECTS,
            Key: { projectId: cleanProjectId },
            ConsistentRead: true,
          })
        );

        if (!existing.Item) {
          logger.warn(`Project ${cleanProjectId} not found`, 404, cleanProjectId);
          return buildErrorResponse(404, 'NOT_FOUND', 'Proyecto no encontrado', reqId);
        }

        if (existing.Item.status === 'PUBLICADO') {
          logger.warn(`Project ${cleanProjectId} already published`, 409, cleanProjectId);
          return buildErrorResponse(409, 'CONFLICT', 'El proyecto ya se encuentra publicado', reqId);
        }

        logger.warn(`Project ${cleanProjectId} in invalid status ${existing.Item.status}`, 409, cleanProjectId);
        return buildErrorResponse(
          409,
          'CONFLICT',
          `El proyecto no está en estado BORRADOR (estado actual: ${existing.Item.status})`,
          reqId
        );
      }

      throw updateErr;
    }

    // 3. Record audit event
    const eventId = crypto.randomUUID();
    await docClient.send(
      new PutCommand({
        TableName: TABLES.AUDIT_EVENTS,
        Item: {
          eventType: 'PROJECT_PUBLISHED',
          'timestamp#eventId': `${now}#${eventId}`,
          eventId,
          timestamp: now,
          actorRef: auth.sub,
          resourceRef: cleanProjectId,
          action: 'PUBLISH_PROJECT',
          outcome: 'SUCCESS',
        },
      })
    ).catch((auditErr) => {
      logger.error('Failed to write audit event', 500, auditErr);
    });

    logger.info('Project published successfully', 200, cleanProjectId);
    return buildSuccessResponse(200, {
      data: {
        projectId: cleanProjectId,
        status: 'PUBLICADO',
        publishedBy: auth.sub,
        updatedAt: now,
      },
      message: 'Proyecto publicado exitosamente',
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }

    logger.error('Failed to publish project', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al publicar el proyecto', reqId);
  }
};
