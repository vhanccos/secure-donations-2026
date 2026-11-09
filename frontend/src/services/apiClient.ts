import { ApiClientError, ApiErrorResponse } from '../types/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic';

export interface ApiRequestOptions extends RequestInit {
  accessToken?: string | null;
  idempotencyKey?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // STRICT ZERO TRUST RULE:
  // Must pass Access Token (NEVER ID Token) to satisfy API Gateway AuthorizationScopes
  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiClientError(response.status, 'PARSE_ERROR', 'Respuesta no parseable del servidor');
    }
  }

  if (response.status === 401) {
    throw new ApiClientError(
      401,
      'UNAUTHORIZED',
      json?.message || 'Sesión no autorizada o expirada. Por favor inicie sesión nuevamente.',
      json?.requestId
    );
  }

  if (response.status === 403) {
    throw new ApiClientError(
      403,
      'FORBIDDEN',
      json?.message || 'Acceso denegado: no cuenta con los permisos o scopes necesarios para esta acción.',
      json?.requestId
    );
  }

  if (!response.ok) {
    const errData = json as ApiErrorResponse | null;
    throw new ApiClientError(
      response.status,
      errData?.code || 'ERROR',
      errData?.message || `Error del servidor HTTP ${response.status}`,
      errData?.requestId
    );
  }

  return json as T;
}
