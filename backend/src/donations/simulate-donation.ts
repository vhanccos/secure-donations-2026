/**
 * Handler: POST /v1/donations/{donationId}/simulate (HU-06: Simulate Confirmation)
 * Academic Stage Only. Protected route: Scope api/donations.write + Role DONANTE owner
 * Concurrency hardened (T08, BOLA T09)
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';
import { SimulateDonationSchema, UUID_V4_REGEX, formatZodError } from '../common/schemas';
import {
  executeSimulateDonationTransaction,
  DonationNotFoundError,
  ForbiddenOwnershipError,
  InvalidStateTransitionError,
} from './donationTransactions';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'SIMULATE_DONATION');

  try {
    // 1. Stage Defense-in-depth check
    if (process.env.STAGE && process.env.STAGE !== 'academic') {
      logger.denied('Simulate endpoint invoked outside academic stage', 403);
      return buildErrorResponse(
        403,
        'FORBIDDEN',
        'El endpoint de simulación solo está disponible en el entorno académico',
        reqId
      );
    }

    // 2. PDP Zero Trust Authorization
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['DONANTE']);

    // 3. Extract and validate path parameter donationId
    const donationId = event.pathParameters?.donationId;
    if (!donationId || !UUID_V4_REGEX.test(donationId.trim())) {
      logger.warn(`Invalid or missing donationId in path: ${donationId}`, 400);
      return buildErrorResponse(
        400,
        'BAD_REQUEST',
        'El parámetro donationId es requerido y debe ser un UUID v4 válido',
        reqId
      );
    }

    // 4. Parse and validate optional body
    let action: 'CONFIRMAR' | 'RECHAZAR' = 'CONFIRMAR';
    if (event.body && event.body.trim() !== '') {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(event.body);
      } catch {
        logger.warn('Malformed JSON payload in simulate body', 400);
        return buildErrorResponse(400, 'BAD_REQUEST', 'El cuerpo de la petición no es un JSON válido', reqId);
      }

      const validation = SimulateDonationSchema.safeParse(parsedJson);
      if (!validation.success) {
        const errorMsg = formatZodError(validation.error);
        logger.warn(`Simulate validation failed: ${errorMsg}`, 400);
        return buildErrorResponse(400, 'BAD_REQUEST', errorMsg, reqId);
      }

      const rawAction = validation.data.action;
      if (rawAction === 'RECHAZAR' || rawAction === 'REJECT') {
        action = 'RECHAZAR';
      } else {
        action = 'CONFIRMAR';
      }
    }

    // 5. Execute atomic state transition
    const result = await executeSimulateDonationTransaction(
      {
        donationId: donationId.trim(),
        callerSub: auth.sub,
        action,
      },
      logger
    );

    return buildSuccessResponse(result.statusCode, result.body);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }
    if (error instanceof DonationNotFoundError) {
      return buildErrorResponse(404, 'NOT_FOUND', error.message, reqId);
    }
    if (error instanceof ForbiddenOwnershipError) {
      return buildErrorResponse(403, 'FORBIDDEN', error.message, reqId);
    }
    if (error instanceof InvalidStateTransitionError) {
      return buildErrorResponse(409, 'CONFLICT', error.message, reqId);
    }

    logger.error('Failed to simulate donation', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al procesar la simulación', reqId);
  }
};
