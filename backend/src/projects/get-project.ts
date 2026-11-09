/**
 * Handler: GET /v1/projects/{projectId} (HU-02) & GET /v1/projects/{projectId}/stats (HU-09)
 * Read-only DynamoDB access, strictly hides draft projects (returns 404)
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../common/dynamo';
import { buildSuccessResponse, buildErrorResponse } from '../common/response';
import { StructuredLogger } from '../common/logger';

function formatCurrency(amountCents: number): string {
  const soles = (amountCents / 100).toFixed(2);
  const parts = soles.split('.');
  const integerPart = parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
  return `S/ ${integerPart}.${parts[1] || '00'}`;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const rawPath = event.rawPath || '';
  const isStats = rawPath.endsWith('/stats') || (event.routeKey && event.routeKey.includes('/stats'));
  const actionName = isStats ? 'GET_PROJECT_STATS' : 'GET_PROJECT_DETAIL';
  const logger = new StructuredLogger(reqId, actionName);

  try {
    const projectId = event.pathParameters?.projectId;
    if (!projectId || projectId.trim() === '') {
      logger.warn('Missing projectId in path parameter', 400);
      return buildErrorResponse(400, 'BAD_REQUEST', 'El parámetro projectId es requerido', reqId);
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.PROJECTS,
        Key: { projectId: projectId.trim() },
      })
    );

    const project = result.Item;

    // Zero Trust Privacy: if non-existent or not published, return 404 without leaking info
    if (!project || project.status !== 'PUBLICADO') {
      logger.warn(`Project ${projectId} not found or not published`, 404, projectId);
      return buildErrorResponse(
        404,
        'NOT_FOUND',
        'Proyecto no encontrado o no disponible',
        reqId
      );
    }

    if (isStats) {
      const goalAmountCents = Number(project.goalAmountCents) || 0;
      const confirmedAmountCents = Number(project.confirmedAmountCents) || 0;
      const percentageCompleted =
        goalAmountCents > 0
          ? Math.min(100, Math.round((confirmedAmountCents / goalAmountCents) * 10000) / 100)
          : 0;

      logger.info('Project stats retrieved successfully', 200, projectId);
      return buildSuccessResponse(200, {
        data: {
          projectId: project.projectId,
          currency: project.currency || 'PEN',
          goalAmountCents,
          confirmedAmountCents,
          percentageCompleted,
          goalAmountFormatted: formatCurrency(goalAmountCents),
          confirmedAmountFormatted: formatCurrency(confirmedAmountCents),
          status: project.status,
        },
        message: 'Estadísticas del proyecto recuperadas exitosamente',
      });
    }

    logger.info('Project detail retrieved successfully', 200, projectId);
    return buildSuccessResponse(200, {
      data: project,
      message: 'Detalle del proyecto recuperado exitosamente',
    });
  } catch (error: unknown) {
    logger.error('Failed to get project', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al consultar el proyecto', reqId);
  }
};
