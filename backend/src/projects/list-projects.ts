/**
 * Handler: GET /v1/projects (HU-01: Public Project Catalog)
 * Read-only DynamoDB access, queries status-createdAt-index for PUBLICADO
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse } from '../common/response';
import { StructuredLogger } from '../common/logger';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'LIST_PROJECTS');

  try {
    const rawLimit = event.queryStringParameters?.limit;
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 50) : 20;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PROJECTS,
        IndexName: 'status-createdAt-index',
        KeyConditionExpression: '#st = :statusVal',
        ExpressionAttributeNames: {
          '#st': 'status',
        },
        ExpressionAttributeValues: {
          ':statusVal': 'PUBLICADO',
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    const items = result.Items || [];

    logger.info('Public catalog retrieved successfully', 200, undefined, { count: items.length });
    return buildSuccessResponse(200, {
      data: items,
      count: items.length,
      message: 'Catálogo público de proyectos recuperado exitosamente',
    });
  } catch (error: unknown) {
    logger.error('Failed to list public projects', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al consultar el catálogo', reqId);
  }
};
