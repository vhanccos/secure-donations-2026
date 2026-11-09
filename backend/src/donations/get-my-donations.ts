/**
 * Handler: GET /v1/donations/me (HU-07: Private Donor History)
 * Protected route: Scope api/donations.read + Role DONANTE
 * Strictly queries GSI donorSub-createdAt-index for authenticated user
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'GET_MY_DONATIONS');

  try {
    // 1. PDP Zero Trust Authorization: Must be DONANTE (T12 defense)
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['DONANTE']);

    const rawLimit = event.queryStringParameters?.limit;
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 50) : 20;

    // 2. Query personal donations by donorSub GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DONATIONS,
        IndexName: 'donorSub-createdAt-index',
        KeyConditionExpression: '#donor = :callerSub',
        ExpressionAttributeNames: {
          '#donor': 'donorSub',
        },
        ExpressionAttributeValues: {
          ':callerSub': auth.sub,
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    const items = result.Items || [];

    logger.info('Donor history retrieved successfully', 200, undefined, { count: items.length });
    return buildSuccessResponse(200, {
      data: items,
      count: items.length,
      donorSub: auth.sub,
      message: 'Historial personal de donaciones recuperado exitosamente',
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }

    logger.error('Failed to get donor history', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al consultar el historial', reqId);
  }
};
