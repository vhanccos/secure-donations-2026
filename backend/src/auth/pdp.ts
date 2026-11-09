/**
 * Zero Trust Policy Decision Point (PDP) (NIST SP 800-207)
 * Evaluates verified JWT claims injected by API Gateway HTTP API PEP
 */
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { HttpError } from '../common/response';

export interface AuthContext {
  sub: string;
  groups: string[];
  email?: string;
  scope?: string;
}

export type Role = 'DONANTE' | 'GESTOR' | 'AUDITOR';

export function extractAuthContext(event: APIGatewayProxyEventV2): AuthContext {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims as
    | Record<string, any>
    | undefined;

  if (!claims || !claims.sub || typeof claims.sub !== 'string') {
    throw new HttpError(
      401,
      'UNAUTHORIZED',
      'Unauthorized: Missing or invalid authentication token'
    );
  }

  const rawGroups = claims['cognito:groups'];
  let groups: string[] = [];

  if (Array.isArray(rawGroups)) {
    groups = rawGroups.map((g) => String(g).trim());
  } else if (typeof rawGroups === 'string') {
    const cleaned = rawGroups.replace(/^\[|\]$/g, '').trim();
    if (cleaned.length > 0) {
      groups = cleaned.split(/[\s,]+/).map((g) => g.trim());
    }
  }

  return {
    sub: claims.sub,
    groups,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    scope: typeof claims.scope === 'string' ? claims.scope : undefined,
  };
}

export function assertRole(auth: AuthContext, allowedRoles: Role[]): void {
  const hasRole = allowedRoles.some((role) => auth.groups.includes(role));
  if (!hasRole) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      `Acceso denegado: se requiere uno de los roles autorizados (${allowedRoles.join(', ')})`
    );
  }
}

export const assertGroup = assertRole;

export function assertOwner(callerSub: string, resourceOwnerSub: string): void {
  if (callerSub !== resourceOwnerSub) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      'Acceso denegado: no es propietario de este recurso'
    );
  }
}

export const assertOwnership = assertOwner;
