/**
 * Uniform HTTP Response Helpers and Security Headers (NIST SP 800-207 Zero Trust Baseline)
 */
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,Idempotency-Key,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function buildSuccessResponse(
  statusCode: number,
  bodyData: unknown,
  extraHeaders: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
    body: JSON.stringify(bodyData)
  };
}

export function buildErrorResponse(
  statusCode: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  extraHeaders: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
    body: JSON.stringify({
      code,
      message,
      requestId
    })
  };
}
