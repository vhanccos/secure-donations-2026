/**
 * Tier 3: Authorization, Role Segregation & BOLA Defense Test Suite
 * Covers Acceptance Test Scenarios:
 * - T03: Donante intenta crear proyecto privado de gestor (403 Forbidden)
 * - T09: BOLA / IDOR: Donante intenta consultar o modificar donación ajena (403/404)
 * - T12: Gestor intenta consultar historial privado de donaciones de un donante (403/404)
 * Trazabilidad: CA-04.1, CA-04.2, CA-04.3, CA-07.1, CA-07.2, CA-10.1, RNF-HU-02
 */

import { randomUUID } from 'node:crypto';
import { apiRequest, getCognitoTokens } from '../src/auth-helper.js';
import { CONFIG } from '../src/config.js';
import { TestReporter } from '../src/reporter.js';

export async function runTier3Tests(reporter = new TestReporter('Tier 3: RBAC & BOLA')) {
  reporter.section('TIER 3 — Authorization, Role Segregation & BOLA Defense (T03, T09, T12)');

  // Obtain genuine OAuth tokens for all four test personas
  const donorA = await getCognitoTokens(CONFIG.USERS.DONANTE_A.email, CONFIG.USERS.DONANTE_A.password);
  const donorB = await getCognitoTokens(CONFIG.USERS.DONANTE_B.email, CONFIG.USERS.DONANTE_B.password);
  const gestor = await getCognitoTokens(CONFIG.USERS.GESTOR.email, CONFIG.USERS.GESTOR.password);
  const auditor = await getCognitoTokens(CONFIG.USERS.AUDITOR.email, CONFIG.USERS.AUDITOR.password);

  // -------------------------------------------------------------------------
  // T03: Vertical Privilege Escalation Defense (Donor -> Gestor)
  // -------------------------------------------------------------------------
  const donorCreateRes = await apiRequest('POST', '/v1/projects', {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
    body: {
      title: 'Proyecto Ilícito por Donante',
      description: 'Intento de creación de proyecto sin rol de GESTOR',
      goalAmountCents: 50000,
    },
  });

  reporter.assert(
    'T03.1',
    'Donante autenticado intentando crear proyecto recibe HTTP 403 Forbidden (GESTOR requerido)',
    'CA-04.1, HU-04',
    donorCreateRes.status === 403 &&
      donorCreateRes.body?.code === 'FORBIDDEN' &&
      donorCreateRes.body?.message?.includes('GESTOR'),
    { status: donorCreateRes.status, body: donorCreateRes.body }
  );

  const donorPublishRes = await apiRequest('PATCH', `/v1/projects/${randomUUID()}/publish`, {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
  });

  reporter.assert(
    'T03.2',
    'Donante autenticado intentando publicar proyecto recibe HTTP 403 Forbidden (GESTOR requerido)',
    'CA-04.1, HU-04',
    donorPublishRes.status === 403 &&
      donorPublishRes.body?.code === 'FORBIDDEN' &&
      donorPublishRes.body?.message?.includes('GESTOR'),
    { status: donorPublishRes.status, body: donorPublishRes.body }
  );

  // -------------------------------------------------------------------------
  // T09: Broken Object Level Authorization (BOLA / IDOR) Defense
  // -------------------------------------------------------------------------
  // Retrieve a published project for donation intention
  const catRes = await apiRequest('GET', '/v1/projects');
  const publishedProjectId = catRes.body?.data?.[0]?.projectId;

  if (!publishedProjectId) {
    throw new Error('No published projects available for BOLA testing');
  }

  // Step 1: Donor A creates donation intention
  const donationKey = randomUUID();
  const donorACreateRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donorA.accessToken}`,
      'Idempotency-Key': donationKey,
    },
    body: {
      projectId: publishedProjectId,
      amountCents: 5000, // S/ 50.00
    },
  });

  const donationAId = donorACreateRes.body?.data?.donationId;
  reporter.assert(
    'T09.1',
    'Donante A registra exitosamente su intención de donación (HTTP 201 Created)',
    'CA-05.1, HU-05',
    donorACreateRes.status === 201 && Boolean(donationAId),
    { status: donorACreateRes.status, donationId: donationAId }
  );

  // Step 2: BOLA Attack — Donor B attempts to confirm Donor A's donation
  const donorBSimulateRes = await apiRequest('POST', `/v1/donations/${donationAId}/simulate`, {
    headers: { Authorization: `Bearer ${donorB.accessToken}` },
    body: { action: 'CONFIRMAR' },
  });

  reporter.assert(
    'T09.2',
    'Ataque BOLA: Donante B intenta simular/confirmar donación de Donante A y recibe HTTP 403 Forbidden',
    'CA-07.2, HU-07',
    donorBSimulateRes.status === 403 &&
      donorBSimulateRes.body?.code === 'FORBIDDEN' &&
      donorBSimulateRes.body?.message?.includes('propietario'),
    { status: donorBSimulateRes.status, body: donorBSimulateRes.body }
  );

  // Step 3: BOLA Data Leak Prevention — Donor B queries personal history
  const donorBHistoryRes = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${donorB.accessToken}` },
  });

  const donationAFoundInB = donorBHistoryRes.body?.data?.some((d) => d.donationId === donationAId);
  reporter.assert(
    'T09.3',
    'Aislamiento de historial: donación de Donante A es totalmente invisible en GET /v1/donations/me de Donante B',
    'CA-07.1, CA-07.2',
    donorBHistoryRes.status === 200 && !donationAFoundInB,
    { status: donorBHistoryRes.status, count: donorBHistoryRes.body?.count, foundInB: donationAFoundInB }
  );

  // Step 4: Legitimate confirmation by actual Owner (Donor A)
  const donorAConfirmRes = await apiRequest('POST', `/v1/donations/${donationAId}/simulate`, {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
    body: { action: 'CONFIRMAR' },
  });

  reporter.assert(
    'T09.4',
    'Propietario legítimo (Donante A) confirma su donación exitosamente (HTTP 200, CONFIRMADA_SIMULADA)',
    'CA-06.1, HU-06',
    donorAConfirmRes.status === 200 && donorAConfirmRes.body?.data?.status === 'CONFIRMADA_SIMULADA',
    { status: donorAConfirmRes.status, body: donorAConfirmRes.body }
  );

  // -------------------------------------------------------------------------
  // T12: Cross-Role Segregation (GESTOR vs DONANTE vs AUDITOR)
  // -------------------------------------------------------------------------
  // T12.1: GESTOR attempting to access private donor history (GET /v1/donations/me)
  const gestorDonationsRes = await apiRequest('GET', '/v1/donations/me', {
    headers: { Authorization: `Bearer ${gestor.accessToken}` },
  });

  reporter.assert(
    'T12.1',
    'GESTOR intentando consultar historial privado de donante recibe HTTP 403 Forbidden (DONANTE requerido)',
    'CA-04.2, HU-04',
    gestorDonationsRes.status === 403 &&
      gestorDonationsRes.body?.code === 'FORBIDDEN' &&
      gestorDonationsRes.body?.message?.includes('DONANTE'),
    { status: gestorDonationsRes.status, body: gestorDonationsRes.body }
  );

  // T12.2: DONANTE attempting to query audit logs (GET /v1/audit)
  const donorAuditRes = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${donorA.accessToken}` },
  });

  reporter.assert(
    'T12.2',
    'DONANTE intentando consultar eventos de auditoría recibe HTTP 403 Forbidden (AUDITOR requerido)',
    'CA-10.1, HU-10',
    donorAuditRes.status === 403 &&
      donorAuditRes.body?.code === 'FORBIDDEN' &&
      donorAuditRes.body?.message?.includes('AUDITOR'),
    { status: donorAuditRes.status, body: donorAuditRes.body }
  );

  // T12.3: GESTOR attempting to query audit logs (GET /v1/audit)
  const gestorAuditRes = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${gestor.accessToken}` },
  });

  reporter.assert(
    'T12.3',
    'GESTOR intentando consultar eventos de auditoría recibe HTTP 403 Forbidden (AUDITOR requerido)',
    'CA-10.1, HU-10',
    gestorAuditRes.status === 403 &&
      gestorAuditRes.body?.code === 'FORBIDDEN' &&
      gestorAuditRes.body?.message?.includes('AUDITOR'),
    { status: gestorAuditRes.status, body: gestorAuditRes.body }
  );

  // T12.4: AUDITOR legitimately queries audit logs (GET /v1/audit)
  const auditorAuditRes = await apiRequest('GET', '/v1/audit', {
    headers: { Authorization: `Bearer ${auditor.accessToken}` },
  });

  reporter.assert(
    'T12.4',
    'AUDITOR autenticado consulta eventos de auditoría legítimamente (HTTP 200 OK con registros)',
    'CA-10.1, CA-10.2, HU-10',
    auditorAuditRes.status === 200 && Array.isArray(auditorAuditRes.body?.data),
    { status: auditorAuditRes.status, count: auditorAuditRes.body?.count, sample: auditorAuditRes.body?.data?.[0]?.eventType }
  );

  return reporter.summary();
}

// Allow direct standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTier3Tests()
    .then((summary) => process.exit(summary.failed === 0 ? 0 : 1))
    .catch((err) => {
      console.error('Fatal execution error in Tier 3:', err);
      process.exit(1);
    });
}
