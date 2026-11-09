/**
 * Handler: POST /v1/donations (HU-05: Create Donation Intention)
 * Protected route: Scope api/donations.write + Role DONANTE
 * Enforces atomic idempotency via TransactWriteItems
 */
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { buildSuccessResponse, buildErrorResponse, HttpError } from '../common/response';
import { StructuredLogger } from '../common/logger';
import { extractAuthContext, assertRole } from '../auth/pdp';
import { CreateDonationSchema, validateIdempotencyKey, formatZodError } from '../common/schemas';
import { getHeader } from '../common/headers';
import {
  executeCreateDonationTransaction,
  ProjectNotFoundError,
  ProjectNotPublishedError,
  IdempotencyConflictError,
} from './donationTransactions';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const reqId = event.requestContext?.requestId || 'req-unknown';
  const logger = new StructuredLogger(reqId, 'CREATE_DONATION');

  try {
    // 1. PDP Zero Trust Authorization
    const auth = extractAuthContext(event);
    logger.setActor(auth.sub);
    assertRole(auth, ['DONANTE']);

    // 2. Validate Idempotency-Key header (case-insensitive per RFC 7230)
    const rawIdempotencyKey = getHeader(event.headers, 'Idempotency-Key');

    let idempotencyKey: string;
    try {
      idempotencyKey = validateIdempotencyKey(rawIdempotencyKey);
    } catch (keyErr: unknown) {
      const msg = keyErr instanceof Error ? keyErr.message : 'Idempotency-Key inválida';
      logger.warn(`Idempotency key error: ${msg}`, 400);
      return buildErrorResponse(400, 'BAD_REQUEST', msg, reqId);
    }

    // 3. Validate request body
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

    const validation = CreateDonationSchema.safeParse(parsedJson);
    if (!validation.success) {
      const errorMsg = formatZodError(validation.error);
      logger.warn(`Donation validation failed: ${errorMsg}`, 400);
      return buildErrorResponse(400, 'BAD_REQUEST', errorMsg, reqId);
    }

    const { projectId, amountCents } = validation.data;

    // 4. Execute atomic transaction
    const result = await executeCreateDonationTransaction(
      {
        donorSub: auth.sub,
        idempotencyKey,
        projectId,
        amountCents,
      },
      logger
    );

    return buildSuccessResponse(result.statusCode, result.body);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      logger.denied(error.message, error.statusCode);
      return buildErrorResponse(error.statusCode, error.code, error.message, reqId);
    }
    if (error instanceof ProjectNotFoundError) {
      return buildErrorResponse(404, 'NOT_FOUND', error.message, reqId);
    }
    if (error instanceof ProjectNotPublishedError || error instanceof IdempotencyConflictError) {
      return buildErrorResponse(409, 'CONFLICT', error.message, reqId);
    }

    logger.error('Failed to create donation intention', 500, error);
    return buildErrorResponse(500, 'INTERNAL_ERROR', 'Error interno al registrar la intención de donación', reqId);
  }
};
