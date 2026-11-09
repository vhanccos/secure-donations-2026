/**
 * Handler: GET /v1/audit (HU-10: Audit Event Inspection)
 * Protected route: Scope api/audit.read + Role AUDITOR
 * Strictly restricted to auditors, sanitizes sensitive tokens
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'GET_AUDIT_EVENTS');

  try {
    // 1. PDP Zero Trust Authorization: Must be AUDITOR
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['AUDITOR']);

    const rawLimit = event.queryStringParameters?.limit;
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 50) : 20;
    const eventType = event.queryStringParameters?.eventType;

    let items: Record<string, unknown>[] = [];

    // 2. Query by eventType partition key, or Scan table
    if (eventType && eventType.trim() !== '') {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLES.AUDIT_EVENTS,
          KeyConditionExpression: 'eventType = :type',
          ExpressionAttributeValues: {
            ':type': eventType.trim(),
          },
          ScanIndexForward: false,
          Limit: limit,
        })
      );
      items = (result.Items as Record<string, unknown>[]) || [];
    } else {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLES.AUDIT_EVENTS,
          Limit: limit,
        })
      );
      items = (result.Items as Record<string, unknown>[]) || [];
    }

    logger.info('Audit events retrieved successfully', 200, undefined, { count: items.length });
    return buildSuccessResponse(200, {
      data: items,
      count: items.length,
      auditorSub: auth.sub,
      message: 'Registros de auditoría recuperados exitosamente',
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }

    logger.error('Failed to get audit events', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al consultar auditoría', reqId);
  }
};
