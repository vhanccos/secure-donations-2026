/**
 * Tier 2: Authentication & Token Security Test Suite
 * Covers Acceptance Test Scenarios:
 * - T02: Intento de donar sin token Authorization Bearer (401 Unauthorized)
 * - T11: Token manipulado/firmado con clave inválida o ID Token usado como Bearer de acceso (401/403)
 * - T13: Token revocado / expirado (rechazado adecuadamente)
 * - T14: Gestor/Auditor inicia sesión sin TOTP MFA (rechazado, no obtiene tokens sin challenge)
 * Trazabilidad: CA-03.2, CA-03.3, CA-03.4, CA-11.1, CA-11.2, CA-NF02.1
 */

import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { apiRequest, getCognitoTokens } from '../src/auth-helper.js';
import { CONFIG } from '../src/config.js';
import { TestReporter } from '../src/reporter.js';

export async function runTier2Tests(reporter = new TestReporter('Tier 2: Auth & Token Security')) {
  reporter.section('TIER 2 — Authentication & Token Security (T02, T11, T13, T14)');

  // -------------------------------------------------------------------------
  // T02: Missing Authorization Header on Protected Routes (HTTP 401)
  // -------------------------------------------------------------------------
  const dummyUuid = randomUUID();
  const protectedEndpoints = [
    {
      id: 'T02.1',
      name: 'POST /v1/donations',
      method: 'POST',
      path: '/v1/donations',
      body: { projectId: dummyUuid, amountCents: 5000 },
      headers: { 'Idempotency-Key': randomUUID() },
    },
    {
      id: 'T02.2',
      name: 'GET /v1/donations/me',
      method: 'GET',
      path: '/v1/donations/me',
    },
    {
      id: 'T02.3',
      name: 'POST /v1/projects',
      method: 'POST',
      path: '/v1/projects',
      body: { title: 'Test', description: 'Desc', goalAmountCents: 50000 },
    },
    {
      id: 'T02.4',
      name: 'PATCH /v1/projects/{id}/publish',
      method: 'PATCH',
      path: `/v1/projects/${dummyUuid}/publish`,
    },
    {
      id: 'T02.5',
      name: 'POST /v1/donations/{id}/simulate',
      method: 'POST',
      path: `/v1/donations/${dummyUuid}/simulate`,
      body: { action: 'CONFIRMAR' },
    },
    {
      id: 'T02.6',
      name: 'GET /v1/audit',
      method: 'GET',
      path: '/v1/audit',
    },
  ];

  for (const ep of protectedEndpoints) {
    const res = await apiRequest(ep.method, ep.path, {
      body: ep.body,
      headers: ep.headers,
    });
    const hasBearerChallenge = res.headers['www-authenticate']?.toLowerCase().includes('bearer');
    const isUnauthorized = res.status === 401 && (res.body?.message === 'Unauthorized' || res.body?.code === 'UNAUTHORIZED');

    reporter.assert(
      ep.id,
      `Solicitud sin token a ${ep.name} devuelve HTTP 401 Unauthorized (PEP Gate)`,
      'CA-03.2, RNF-HU-02',
      res.status === 401 && hasBearerChallenge,
      { status: res.status, wwwAuthenticate: res.headers['www-authenticate'], body: res.body }
    );
  }

  // -------------------------------------------------------------------------
  // T11: Forged, Corrupted, and Tampered Tokens (HTTP 401)
  // -------------------------------------------------------------------------
  const donorTokens = await getCognitoTokens(CONFIG.USERS.DONANTE_A.email, CONFIG.USERS.DONANTE_A.password);
  const tamperedSig = donorTokens.accessToken.slice(0, -6) + 'ABCDEF';
  const algNoneToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwiY29nbml0bzpncm91cHMiOlsiR0VTVE9SIl19.';

  const tokenTamperingProbes = [
    { id: 'T11.1', desc: 'Bearer vacío', header: 'Bearer ' },
    { id: 'T11.2', desc: 'Token corrupto / cadena aleatoria', header: 'Bearer invalid.tampered.token.garbage123' },
    { id: 'T11.3', desc: 'Firma criptográfica alterada en token auténtico', header: `Bearer ${tamperedSig}` },
    { id: 'T11.4', desc: 'Ataque con algoritmo none (alg: none)', header: `Bearer ${algNoneToken}` },
  ];

  for (const probe of tokenTamperingProbes) {
    const res = await apiRequest('GET', '/v1/donations/me', {
      headers: { Authorization: probe.header },
    });
    reporter.assert(
      probe.id,
      `Token manipulado (${probe.desc}) devuelve HTTP 401 Unauthorized`,
      'CA-03.2, CA-NF02.1',
      res.status === 401,
      { status: res.status, wwwAuth: res.headers['www-authenticate'], body: res.body }
    );
  }

  // -------------------------------------------------------------------------
  // T11 (Part 2): Cognito ID Token Rejected Due to Missing Scopes (HTTP 403)
  // -------------------------------------------------------------------------
  // Authentic Cognito ID Token (has valid RSA signature, valid issuer, but lacks custom OAuth scopes)
  const idToken = donorTokens.idToken;

  for (const ep of protectedEndpoints) {
    const testId = `T11.ID_${ep.id.replace('T02.', '')}`;
    const res = await apiRequest(ep.method, ep.path, {
      body: ep.body,
      headers: {
        ...(ep.headers || {}),
        Authorization: `Bearer ${idToken}`,
      },
    });

    const isScopeRejection =
      (res.status === 403 || res.status === 401) &&
      (res.headers['www-authenticate']?.includes('insufficient_scope') ||
        res.body?.message === 'Forbidden');

    reporter.assert(
      testId,
      `ID Token presentado como Bearer a ${ep.name} es rechazado por falta de scopes (HTTP 403/401)`,
      'CA-03.2, CA-NF02.1',
      isScopeRejection,
      { status: res.status, wwwAuth: res.headers['www-authenticate'], body: res.body }
    );
  }

  // -------------------------------------------------------------------------
  // T13: Token Expiration and Revocation Protocol (CA-03.3, CA-03.4)
  // -------------------------------------------------------------------------
  // T13.1: Token with expired timestamp is rejected with HTTP 401
  const headerPart = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'expired-kid' })).toString('base64url');
  const payloadPart = Buffer.from(
    JSON.stringify({
      sub: donorTokens.sub,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
      iss: `https://cognito-idp.${CONFIG.AWS_REGION}.amazonaws.com/${CONFIG.COGNITO_USER_POOL_ID}`,
      client_id: CONFIG.COGNITO_CLIENT_ID,
      token_use: 'access',
      scope: 'api/donations.read',
    })
  ).toString('base64url');
  const expiredJwt = `${headerPart}.${payloadPart}.tampered_signature_for_expired_test`;

  const expiredRes = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${expiredJwt}` },
  });
  reporter.assert(
    'T13.1',
    'Token con fecha de expiración en el pasado devuelve HTTP 401 Unauthorized',
    'CA-03.2, CA-03.4',
    expiredRes.status === 401,
    { status: expiredRes.status, wwwAuth: expiredRes.headers['www-authenticate'] }
  );

  // T13.2: Refresh token revocation via /oauth2/revoke
  let revokeSuccess = false;
  let refreshBlocked = false;
  try {
    // Acquire a fresh set of tokens for Donor B to test revocation without invalidating Donor A
    const donorBTokens = await getCognitoTokens(CONFIG.USERS.DONANTE_B.email, CONFIG.USERS.DONANTE_B.password);
    const refreshToken = donorBTokens.refreshToken;

    const revokeParams = new URLSearchParams();
    revokeParams.append('token', refreshToken);
    revokeParams.append('client_id', CONFIG.COGNITO_CLIENT_ID);

    const revokeRes = await fetch(`${CONFIG.COGNITO_DOMAIN}/oauth2/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: revokeParams.toString(),
    });
    revokeSuccess = revokeRes.status === 200;

    // Verify refresh attempt with the revoked token fails
    const refreshParams = new URLSearchParams();
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('client_id', CONFIG.COGNITO_CLIENT_ID);
    refreshParams.append('refresh_token', refreshToken);

    const attemptRefreshRes = await fetch(`${CONFIG.COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });
    const refreshData = await attemptRefreshRes.json();
    refreshBlocked = attemptRefreshRes.status === 400 && refreshData.error === 'invalid_grant';
  } catch (err) {
    console.warn('Revocation flow error:', err.message);
  }

  reporter.assert(
    'T13.2',
    'Revocación de Refresh Token mediante /oauth2/revoke deshabilita renovaciones subsiguientes (invalid_grant)',
    'CA-03.3, CA-03.4',
    revokeSuccess && refreshBlocked,
    { revokeSuccess, refreshBlocked }
  );

  // T13.3: Verify App Client short-lived access token policy (15 minutes max)
  let shortLivedEnforced = false;
  try {
    const describeCmd = `aws cognito-idp describe-user-pool-client --user-pool-id "${CONFIG.COGNITO_USER_POOL_ID}" --client-id "${CONFIG.COGNITO_CLIENT_ID}" --region "${CONFIG.AWS_REGION}" --query "UserPoolClient.AccessTokenValidity" --output text`;
    const validity = parseInt(execSync(describeCmd, { encoding: 'utf8' }).trim(), 10);
    shortLivedEnforced = validity <= 15;
  } catch (err) {
    // Fallback inspection from token validity
    shortLivedEnforced = donorTokens.expiresIn <= 900;
  }

  reporter.assert(
    'T13.3',
    'Vigencia máxima del Access Token fijada en <= 15 minutos en Amazon Cognito para mitigar revocación diferida',
    'CA-03.3, CA-03.4',
    shortLivedEnforced,
    { shortLivedEnforced }
  );

  // -------------------------------------------------------------------------
  // T14: Mandatory TOTP MFA for Privileged Administrative Roles (CA-11.2)
  // -------------------------------------------------------------------------
  let mfaChallenged = false;
  let invalidTotpRejected = false;

  try {
    // Initiate Auth for Gestor with MFA enabled via AWS CLI or SDK
    const initCmd = `aws cognito-idp initiate-auth \
      --client-id "${CONFIG.COGNITO_CLIENT_ID}" \
      --auth-flow USER_PASSWORD_AUTH \
      --auth-parameters USERNAME="${CONFIG.USERS.GESTOR_MFA.email}",PASSWORD="${CONFIG.USERS.GESTOR_MFA.password}" \
      --region "${CONFIG.AWS_REGION}" \
      --output json`;

    const initOutput = JSON.parse(execSync(initCmd, { encoding: 'utf8' }));
    mfaChallenged =
      initOutput.ChallengeName === 'SOFTWARE_TOKEN_MFA' &&
      Boolean(initOutput.Session) &&
      !initOutput.AuthenticationResult;

    if (initOutput.Session) {
      // Attempt to answer challenge with incorrect TOTP code
      const respondCmd = `aws cognito-idp respond-to-auth-challenge \
        --client-id "${CONFIG.COGNITO_CLIENT_ID}" \
        --challenge-name SOFTWARE_TOKEN_MFA \
        --session "${initOutput.Session}" \
        --challenge-responses USERNAME="${CONFIG.USERS.GESTOR_MFA.email}",SOFTWARE_TOKEN_MFA_CODE=000000 \
        --region "${CONFIG.AWS_REGION}" 2>&1 || true`;

      const respondOutput = execSync(respondCmd, { encoding: 'utf8' });
      invalidTotpRejected = respondOutput.includes('CodeMismatchException') || respondOutput.includes('Invalid code');
    }
  } catch (err) {
    console.warn('MFA challenge test error:', err.message);
  }

  reporter.assert(
    'T14.1',
    'Usuario GESTOR privilegiado inicia sesión y recibe desafío SOFTWARE_TOKEN_MFA sin obtener tokens directamente',
    'CA-11.1, CA-11.2, HU-11',
    mfaChallenged,
    { mfaChallenged }
  );

  reporter.assert(
    'T14.2',
    'Intento de resolver desafío MFA con código TOTP incorrecto es rechazado por Cognito (CodeMismatchException)',
    'CA-11.2, HU-11',
    invalidTotpRejected,
    { invalidTotpRejected }
  );

  return reporter.summary();
}

// Allow direct standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTier2Tests()
    .then((summary) => process.exit(summary.failed === 0 ? 0 : 1))
    .catch((err) => {
      console.error('Fatal execution error in Tier 2:', err);
      process.exit(1);
    });
}
