/**
 * Tier 5: Adversarial Concurrency & Transaction Boundary Stress Test Suite
 * Empirical Challenger Verification for M5 (Hardening)
 * 
 * Tests:
 * - ADV-CONC-1: 10 simultaneous confirmation requests on the same donation (1x 200 OK, 9x 409 Conflict)
 * - ADV-CONC-2: Project confirmedAmountCents increments strictly once by exact donation amount
 * - ADV-CONC-3: 15 simultaneous creation requests with identical Idempotency-Key (atomic reservation & replay)
 * - ADV-CONC-4: Mixed 10-way race condition (5x CONFIRMAR vs 5x RECHAZAR simultaneously)
 * - ADV-CONC-5: Post-confirmation replay attempt rejected with HTTP 409 (zero balance leakage)
 */

import { randomUUID } from 'node:crypto';
import { apiRequest, getCognitoTokens } from '../src/auth-helper.js';
import { CONFIG } from '../src/config.js';
import { TestReporter } from '../src/reporter.js';

export async function runTier5AdversarialTests(reporter = new TestReporter('Tier 5: Adversarial Concurrency')) {
  reporter.section('TIER 5 — Adversarial Concurrency & Transaction Boundary Hardening');

  const donor = await getCognitoTokens(CONFIG.USERS.DONANTE_A.email, CONFIG.USERS.DONANTE_A.password);

  // Retrieve an active published project
  const catRes = await apiRequest('GET', '/v1/projects');
  const validProjectId = catRes.body?.data?.[0]?.projectId;

  if (!validProjectId) {
    throw new Error('No published projects found for adversarial concurrency stress testing');
  }

  // =========================================================================
  // ADV-CONC-1 & ADV-CONC-2: 10 Simultaneous Confirmations & Single Balance Delta
  // =========================================================================
  const testAmountCents = 6500; // S/ 65.00
  const concKey1 = randomUUID();

  // Create donation
  const createRes1 = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': concKey1,
    },
    body: {
      projectId: validProjectId,
      amountCents: testAmountCents,
    },
  });

  const donationId1 = createRes1.body?.data?.donationId;
  if (!donationId1 || createRes1.status !== 201) {
    throw new Error(`Failed to create donation for ADV-CONC-1: ${createRes1.status}`);
  }

  // Get project stats before race
  const statsBefore1 = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const initialConfirmed1 = statsBefore1.body?.data?.confirmedAmountCents || 0;

  // Fire 10 simultaneous requests to confirm the SAME donation
  const confirmCalls1 = Array.from({ length: 10 }, (_, idx) =>
    apiRequest('POST', `/v1/donations/${donationId1}/simulate`, {
      headers: { Authorization: `Bearer ${donor.accessToken}` },
      body: { action: 'CONFIRMAR' },
    })
  );

  const responses1 = await Promise.all(confirmCalls1);
  const statusCodes1 = responses1.map((r) => r.status);
  const count200_1 = statusCodes1.filter((s) => s === 200).length;
  const count409_1 = statusCodes1.filter((s) => s === 409).length;

  reporter.assert(
    'ADV-CONC-1',
    'Estrés 10 peticiones concurrentes de confirmación: exactamente 1x HTTP 200 y 9x HTTP 409',
    'CA-06.2, CA-NF04.1',
    count200_1 === 1 && count409_1 === 9,
    { count200: count200_1, count409: count409_1, statusCodes: statusCodes1 }
  );

  // Check project balance delta
  const statsAfter1 = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const finalConfirmed1 = statsAfter1.body?.data?.confirmedAmountCents || 0;
  const delta1 = finalConfirmed1 - initialConfirmed1;

  reporter.assert(
    'ADV-CONC-2',
    `Incremento atómico en DynamoDB: confirmedAmountCents se incrementa exactamente por ${testAmountCents} céntimos (cero doble conteo)`,
    'CA-06.2, CA-NF04.1, CA-NF04.2',
    delta1 === testAmountCents,
    { initial: initialConfirmed1, final: finalConfirmed1, delta: delta1, expected: testAmountCents }
  );

  // =========================================================================
  // ADV-CONC-3: 10 Simultaneous Creaciones con la Misma Idempotency-Key
  // =========================================================================
  const idempotencyKeyShared = randomUUID();
  const creationAmountCents = 4000;

  const simultaneousCreations = Array.from({ length: 10 }, () =>
    apiRequest('POST', '/v1/donations', {
      headers: {
        Authorization: `Bearer ${donor.accessToken}`,
        'Idempotency-Key': idempotencyKeyShared,
      },
      body: {
        projectId: validProjectId,
        amountCents: creationAmountCents,
      },
    })
  );

  const creationResponses = await Promise.all(simultaneousCreations);
  const creationStatuses = creationResponses.map((r) => r.status);
  const allCreatedOk = creationStatuses.every((s) => s === 201 || s === 200);

  const distinctDonationIds = new Set(
    creationResponses
      .map((r) => r.body?.data?.donationId)
      .filter(Boolean)
  );

  reporter.assert(
    'ADV-CONC-3',
    'Concurrencia masiva en creación: 10 peticiones paralelas con la misma Idempotency-Key generan exactamente un único donationId consistente',
    'CA-05.4, RNF-HU-04',
    allCreatedOk && distinctDonationIds.size === 1,
    { totalCalls: 10, statuses: creationStatuses, uniqueDonationIds: Array.from(distinctDonationIds) }
  );

  // =========================================================================
  // ADV-CONC-4: Mixed Race Condition (5x CONFIRMAR vs 5x RECHAZAR)
  // =========================================================================
  const mixedAmountCents = 3500;
  const mixedKey = randomUUID();

  const mixedCreateRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': mixedKey,
    },
    body: {
      projectId: validProjectId,
      amountCents: mixedAmountCents,
    },
  });

  const mixedDonationId = mixedCreateRes.body?.data?.donationId;

  const statsBeforeMixed = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const initialConfirmedMixed = statsBeforeMixed.body?.data?.confirmedAmountCents || 0;

  // Interleave 5 confirms and 5 rejects
  const mixedCalls = Array.from({ length: 10 }, (_, i) => {
    const action = i % 2 === 0 ? 'CONFIRMAR' : 'RECHAZAR';
    return apiRequest('POST', `/v1/donations/${mixedDonationId}/simulate`, {
      headers: { Authorization: `Bearer ${donor.accessToken}` },
      body: { action },
    });
  });

  const mixedResponses = await Promise.all(mixedCalls);
  const mixed200 = mixedResponses.filter((r) => r.status === 200);
  const mixed409 = mixedResponses.filter((r) => r.status === 409);

  const winningResponse = mixed200[0]?.body?.data;
  const winningStatus = winningResponse?.status; // 'CONFIRMADA_SIMULADA' or 'RECHAZADA_SIMULADA'

  const statsAfterMixed = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const finalConfirmedMixed = statsAfterMixed.body?.data?.confirmedAmountCents || 0;
  const deltaMixed = finalConfirmedMixed - initialConfirmedMixed;

  const expectedDeltaMixed = winningStatus === 'CONFIRMADA_SIMULADA' ? mixedAmountCents : 0;

  reporter.assert(
    'ADV-CONC-4',
    'Colisión mixta concurrente: 5x CONFIRMAR vs 5x RECHAZAR resulta en exactamente 1x HTTP 200 y 9x HTTP 409 con estado y balance consistentes',
    'CA-06.2, CA-06.3, CA-NF04.1',
    mixed200.length === 1 && mixed409.length === 9 && deltaMixed === expectedDeltaMixed,
    {
      winningStatus,
      count200: mixed200.length,
      count409: mixed409.length,
      delta: deltaMixed,
      expectedDelta: expectedDeltaMixed,
    }
  );

  // =========================================================================
  // ADV-CONC-5: Post-settlement Replay Attack
  // =========================================================================
  // Attempting to confirm or reject an already closed donation returns 409
  const statsPrePostReplay = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const baseConfirmedPre = statsPrePostReplay.body?.data?.confirmedAmountCents || 0;

  const postReplayRes = await apiRequest('POST', `/v1/donations/${donationId1}/simulate`, {
    headers: { Authorization: `Bearer ${donor.accessToken}` },
    body: { action: 'CONFIRMAR' },
  });

  const statsPostReplay = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const finalConfirmedPost = statsPostReplay.body?.data?.confirmedAmountCents || 0;
  const deltaPost = finalConfirmedPost - baseConfirmedPre;

  reporter.assert(
    'ADV-CONC-5',
    'Intento posterior de confirmar donación ya cerrada devuelve HTTP 409 Conflict y no altera el balance del proyecto (delta = 0)',
    'CA-06.2, CA-NF04.1',
    postReplayRes.status === 409 && deltaPost === 0,
    { status: postReplayRes.status, delta: deltaPost, body: postReplayRes.body }
  );

  return reporter.summary();
}

// CLI direct run
if (import.meta.url === `file://${process.argv[1]}`) {
  runTier5AdversarialTests()
    .then((summary) => process.exit(summary.failed === 0 ? 0 : 1))
    .catch((err) => {
      console.error('Fatal execution error in Tier 5 Adversarial:', err);
      process.exit(1);
    });
}
