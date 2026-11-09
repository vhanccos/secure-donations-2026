/**
 * Empirical Adversarial Auth & Scope Challenger Probe
 * Exercises edge cases, token tampering, scope enforcement, BOLA defense, and cross-role matrix.
 */
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { apiRequest, getCognitoTokens } from './src/auth-helper.js';
import { CONFIG } from './src/config.js';

async function runAdversarialProbe() {
  console.log('======================================================================');
  console.log('   M5 ADVERSARIAL AUTH & SCOPE CHALLENGER PROBE');
  console.log('   Target API: ' + CONFIG.API_BASE_URL);
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertCheck(name, condition, details = {}) {
    if (condition) {
      console.log(`  ✔ PASS [ADV] ${name}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL [ADV] ${name}`);
      console.error('    Details:', JSON.stringify(details, null, 2));
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Unauthenticated Requests (PEP Gate Verification)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Unauthenticated Requests (401 + WWW-Authenticate: Bearer) ---');
  const privateEndpoints = [
    { method: 'POST', path: '/v1/projects', body: { title: 'X', description: 'Y', goalAmountCents: 50000 } },
    { method: 'PATCH', path: `/v1/projects/${randomUUID()}/publish` },
    { method: 'POST', path: '/v1/donations', body: { projectId: randomUUID(), amountCents: 5000 }, headers: { 'Idempotency-Key': randomUUID() } },
    { method: 'POST', path: `/v1/donations/${randomUUID()}/simulate`, body: { action: 'CONFIRMAR' } },
    { method: 'GET', path: '/v1/donations/me' },
    { method: 'GET', path: '/v1/audit' },
  ];

  for (const ep of privateEndpoints) {
    const res = await apiRequest(ep.method, ep.path, { body: ep.body, headers: ep.headers });
    const hasBearer = res.headers['www-authenticate']?.toLowerCase().includes('bearer');
    assertCheck(`No auth to ${ep.method} ${ep.path} -> 401 + WWW-Authenticate Bearer`, res.status === 401 && hasBearer, {
      status: res.status,
      wwwAuth: res.headers['www-authenticate'],
      body: res.body,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Obtain Genuine Persona Tokens
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Acquiring Persona Tokens from Cognito ---');
  const donorA = await getCognitoTokens(CONFIG.USERS.DONANTE_A.email, CONFIG.USERS.DONANTE_A.password);
  const donorB = await getCognitoTokens(CONFIG.USERS.DONANTE_B.email, CONFIG.USERS.DONANTE_B.password);
  const gestor = await getCognitoTokens(CONFIG.USERS.GESTOR.email, CONFIG.USERS.GESTOR.password);
  const auditor = await getCognitoTokens(CONFIG.USERS.AUDITOR.email, CONFIG.USERS.AUDITOR.password);

  console.log(`  Donor A sub: ${donorA.sub}, groups: ${donorA.groups.join(',')}`);
  console.log(`  Donor B sub: ${donorB.sub}, groups: ${donorB.groups.join(',')}`);
  console.log(`  Gestor sub:  ${gestor.sub}, groups: ${gestor.groups.join(',')}`);
  console.log(`  Auditor sub: ${auditor.sub}, groups: ${auditor.groups.join(',')}`);

  // -------------------------------------------------------------------------
  // 3. ID Token Presented as Bearer Token (Scope Enforcement)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. ID Token Presented as Bearer Token (Must fail: 403 insufficient_scope) ---');
  for (const ep of privateEndpoints) {
    const res = await apiRequest(ep.method, ep.path, {
      headers: {
        Authorization: `Bearer ${donorA.idToken}`,
        ...(ep.headers || {}),
      },
      body: ep.body,
    });
    // API Gateway HTTP API with JWT authorizer rejects missing scopes with 403 Forbidden
    const isRejected = res.status === 403 || res.status === 401;
    assertCheck(`ID token on ${ep.method} ${ep.path} rejected (${res.status})`, isRejected, {
      status: res.status,
      body: res.body,
      headers: res.headers,
    });
  }

  // -------------------------------------------------------------------------
  // 4. Tampered Signatures and Alg: None attacks
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Tampered Signatures and Malformed Tokens ---');
  const [h, p, s] = donorA.accessToken.split('.');
  const tamperedSig = s.slice(0, -4) + (s.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  const tamperedToken = `${h}.${p}.${tamperedSig}`;

  const resTampered = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  assertCheck('Tampered token signature -> 401 Unauthorized', resTampered.status === 401, {
    status: resTampered.status,
    body: resTampered.body,
  });

  // Alg: none attack
  const algNoneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const algNoneToken = `${algNoneHeader}.${p}.`;
  const resAlgNone = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${algNoneToken}` },
  });
  assertCheck('Alg: none attack token -> 401 Unauthorized', resAlgNone.status === 401, {
    status: resAlgNone.status,
    body: resAlgNone.body,
  });

  // Garbage token
  const resGarbage = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: 'Bearer this_is_definitely_not_a_valid_jwt' },
  });
  assertCheck('Garbage Bearer token -> 401 Unauthorized', resGarbage.status === 401, {
    status: resGarbage.status,
    body: resGarbage.body,
  });

  // -------------------------------------------------------------------------
  // 5. MFA Challenge Verification on Privileged Persona
  // -------------------------------------------------------------------------
  console.log('\n--- 5. TOTP MFA Enforcement on Privileged User ---');
  try {
    const mfaInitRaw = execSync(
      `aws cognito-idp initiate-auth --client-id ${CONFIG.COGNITO_CLIENT_ID} --auth-flow USER_PASSWORD_AUTH --auth-parameters USERNAME=${CONFIG.USERS.GESTOR_MFA.email},PASSWORD=${CONFIG.USERS.GESTOR_MFA.password} --region ${CONFIG.AWS_REGION} --output json`,
      { encoding: 'utf8' }
    );
    const mfaInit = JSON.parse(mfaInitRaw);
    const hasChallenge = mfaInit.ChallengeName === 'SOFTWARE_TOKEN_MFA';
    const noTokens = !mfaInit.AuthenticationResult;
    assertCheck('GESTOR MFA user triggers SOFTWARE_TOKEN_MFA without tokens', hasChallenge && noTokens, {
      challenge: mfaInit.ChallengeName,
      sessionPresent: Boolean(mfaInit.Session),
    });

    // Test bad TOTP code
    let badTotpRejected = false;
    try {
      execSync(
        `aws cognito-idp respond-to-auth-challenge --client-id ${CONFIG.COGNITO_CLIENT_ID} --challenge-name SOFTWARE_TOKEN_MFA --session "${mfaInit.Session}" --challenge-responses USERNAME=${CONFIG.USERS.GESTOR_MFA.email},SOFTWARE_TOKEN_MFA_CODE=000000 --region ${CONFIG.AWS_REGION} --output json 2>&1`,
        { encoding: 'utf8' }
      );
    } catch (totpErr) {
      badTotpRejected = totpErr.message.includes('CodeMismatchException') || totpErr.message.includes('SoftwareTokenMFANotFoundException') || totpErr.status !== 0;
    }
    assertCheck('Invalid TOTP code 000000 rejected by Cognito', badTotpRejected);
  } catch (err) {
    assertCheck('MFA check executed', false, { error: err.message });
  }

  // -------------------------------------------------------------------------
  // 6. BOLA Defense & Tenant Isolation (T09)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. BOLA Defense & Tenant Isolation (T09) ---');
  // Get active published project
  const catRes = await apiRequest('GET', '/v1/projects');
  const testProject = catRes.body?.data?.[0]?.projectId;

  if (!testProject) {
    throw new Error('No published project found for BOLA test');
  }

  // Donor A creates donation intention
  const keyA = randomUUID();
  const resDonationA = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donorA.accessToken}`,
      'Idempotency-Key': keyA,
    },
    body: {
      projectId: testProject,
      amountCents: 5000,
    },
  });
  const donationAId = resDonationA.body?.data?.donationId;
  assertCheck('Donor A creates donation successfully (201)', resDonationA.status === 201 && Boolean(donationAId), {
    status: resDonationA.status,
    donationId: donationAId,
  });

  // Donor B attempts to confirm Donor A's donation (BOLA attack)
  const resBOLA = await apiRequest('POST', `/v1/donations/${donationAId}/simulate`, {
    headers: { Authorization: `Bearer ${donorB.accessToken}` },
    body: { action: 'CONFIRMAR' },
  });
  assertCheck('Donor B confirming Donor A donation -> 403 Forbidden', resBOLA.status === 403, {
    status: resBOLA.status,
    body: resBOLA.body,
  });

  // Donor B queries history with injected parameter (?donorSub=donorA)
  const resHistorySpoof = await apiRequest('GET', `/v1/donations/me?donorSub=${donorA.sub}`, {
    headers: { Authorization: `Bearer ${donorB.accessToken}` },
  });
  const foundAinB = resHistorySpoof.body?.data?.some(d => d.donationId === donationAId);
  assertCheck('Donor B cannot view Donor A donation even with query param injection', resHistorySpoof.status === 200 && !foundAinB, {
    status: resHistorySpoof.status,
    foundInB: foundAinB,
  });

  // Legitimate confirmation by Owner (Donor A)
  const resConfirmA = await apiRequest('POST', `/v1/donations/${donationAId}/simulate`, {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
    body: { action: 'CONFIRMAR' },
  });
  assertCheck('Donor A confirms own donation successfully (200)', resConfirmA.status === 200 && resConfirmA.body?.data?.status === 'CONFIRMADA_SIMULADA', {
    status: resConfirmA.status,
    body: resConfirmA.body,
  });

  // -------------------------------------------------------------------------
  // 7. Cross-Role Matrix (Segregation Verification)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Cross-Role Segregation Matrix ---');
  // 7.1 DONANTE trying to create project -> 403
  const dCreate = await apiRequest('POST', '/v1/projects', {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
    body: { title: 'Hacked', description: 'Desc', goalAmountCents: 50000 },
  });
  assertCheck('DONANTE calling POST /v1/projects -> 403', dCreate.status === 403, { status: dCreate.status, body: dCreate.body });

  // 7.2 DONANTE trying to publish project -> 403
  const dPublish = await apiRequest('PATCH', `/v1/projects/${testProject}/publish`, {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
  });
  assertCheck('DONANTE calling PATCH /v1/projects/{id}/publish -> 403', dPublish.status === 403, { status: dPublish.status, body: dPublish.body });

  // 7.3 DONANTE trying to read audit logs -> 403
  const dAudit = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
  });
  assertCheck('DONANTE calling GET /v1/audit -> 403', dAudit.status === 403, { status: dAudit.status, body: dAudit.body });

  // 7.4 GESTOR trying to read private donations history -> 403
  const gDonations = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${gestor.accessToken}` },
  });
  assertCheck('GESTOR calling GET /v1/donations/me -> 403', gDonations.status === 403, { status: gDonations.status, body: gDonations.body });

  // 7.5 GESTOR trying to read audit logs -> 403
  const gAudit = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${gestor.accessToken}` },
  });
  assertCheck('GESTOR calling GET /v1/audit -> 403', gAudit.status === 403, { status: gAudit.status, body: gAudit.body });

  // 7.6 AUDITOR trying to create project -> 403
  const aCreateProj = await apiRequest('POST', '/v1/projects', {
    headers: { Authorization: `Bearer ${auditor.accessToken}` },
    body: { title: 'Auditor Proj', description: 'Desc', goalAmountCents: 50000 },
  });
  assertCheck('AUDITOR calling POST /v1/projects -> 403', aCreateProj.status === 403, { status: aCreateProj.status, body: aCreateProj.body });

  // 7.7 AUDITOR trying to create donation -> 403
  const aCreateDon = await apiRequest('POST', '/v1/donations', {
    headers: { Authorization: `Bearer ${auditor.accessToken}`, 'Idempotency-Key': randomUUID() },
    body: { projectId: testProject, amountCents: 5000 },
  });
  assertCheck('AUDITOR calling POST /v1/donations -> 403', aCreateDon.status === 403, { status: aCreateDon.status, body: aCreateDon.body });

  // 7.8 AUDITOR trying to read donor history -> 403
  const aDonations = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${auditor.accessToken}` },
  });
  assertCheck('AUDITOR calling GET /v1/donations/me -> 403', aDonations.status === 403, { status: aDonations.status, body: aDonations.body });

  // 7.9 AUDITOR legitimately reading audit logs -> 200
  const aAudit = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${auditor.accessToken}` },
  });
  assertCheck('AUDITOR calling GET /v1/audit -> 200 OK', aAudit.status === 200 && Array.isArray(aAudit.body?.data), {
    status: aAudit.status,
    count: aAudit.body?.count,
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`VERDICT: ${failed === 0 ? 'ALL CHECKS PASSED (APPROVED)' : 'FAILURES DETECTED (REJECTED)'}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialProbe().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
