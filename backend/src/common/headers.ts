/**
 * Case-insensitive HTTP Header Extraction (RFC 7230 Section 3.2)
 * Robust header lookup across direct invocations, proxies, and API Gateway formats.
 */
import { APIGatewayProxyEventHeaders } from 'aws-lambda';

/**
 * Retrieves an HTTP header value from an event headers map in a case-insensitive manner,
 * adhering to RFC 7230 Section 3.2 ("Each header field consists of a case-insensitive field name").
 *
 * Lookup strategy:
 * 1. Immediate undefined return if headers map is null, undefined, or non-object.
 * 2. O(1) exact match fast-path: headers[headerName]
 * 3. O(1) lowercase fast-path: headers[headerName.toLowerCase()] (API Gateway HTTP API v2 standard)
 * 4. O(N) case-insensitive scan: trims and compares normalized lowercase keys
 *
 * @param headers - APIGatewayProxyEventHeaders, Record<string, string | undefined>, or undefined/null
 * @param headerName - Target header name to locate (e.g. 'Idempotency-Key')
 * @returns Header value string if found, otherwise undefined
 */
export function getHeader(
  headers: APIGatewayProxyEventHeaders | Record<string, string | undefined> | undefined | null,
  headerName: string
): string | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  // 1. Exact match fast-path
  if (headers[headerName] !== undefined) {
    return headers[headerName];
  }

  const normalizedTarget = headerName.trim().toLowerCase();

  // 2. Direct lowercase fast-path (API Gateway HTTP API v2 standardizes incoming headers as lowercase)
  if (headers[normalizedTarget] !== undefined) {
    return headers[normalizedTarget];
  }

  // 3. Fallback linear scan over keys for arbitrary casings (e.g. IDEMPOTENCY-KEY, PascalCase, mixed)
  for (const [key, value] of Object.entries(headers)) {
    if (key.trim().toLowerCase() === normalizedTarget) {
      return value;
    }
  }

  return undefined;
}
