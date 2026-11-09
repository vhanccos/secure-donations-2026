/**
 * Tier 4: Business Logic Integrity, Atomic Idempotency, Concurrency & Workload Privilege Test Suite
 * Covers Acceptance Test Scenarios:
 * - T04: Validación de montos: 0, 100001 centavos o valores no enteros/negativos (400 Bad Request)
 * - T05: Donante crea intención válida con clave de idempotencia (201 Created, status PENDIENTE_SIMULACION)
 * - T06: Repetición de clave de idempotencia con payload idéntico (201/200 cached, sin duplicar donación)
 * - T07: Repetición de clave de idempotencia con payload distinto / hash mismatch (409 Conflict)
 * - T08: Concurrencia masiva (10 peticiones simultáneas confirmando la misma donación): exactamente una tiene éxito, meta de proyecto se incrementa exactamente una sola vez
 * - T10: Least Privilege / IAM: Lambda de lectura intenta escribir en DynamoDB -> AccessDenied y degradación controlada
 * Trazabilidad: CA-05.1, CA-05.2, CA-05.4, CA-06.2, CA-NF03.1, CA-NF04.1, CA-NF04.2
 */

import { randomUUID } from 'node:crypto';
import { apiRequest, getCognitoTokens } from '../src/auth-helper.js';
import { simulateReadOnlyPolicy } from '../src/iam-helper.js';
import { CONFIG } from '../src/config.js';
import { TestReporter } from '../src/reporter.js';

export async function runTier4Tests(reporter = new TestReporter('Tier 4: Integrity & Concurrency')) {
  reporter.section('TIER 4 — Data Integrity, Atomic Idempotency, Concurrency & IAM Privilege (T04-T08, T10)');

  const donor = await getCognitoTokens(CONFIG.USERS.DONANTE_A.email, CONFIG.USERS.DONANTE_A.password);

  // Retrieve an active published project for transactions
  const catRes = await apiRequest('GET', '/v1/projects');
  const validProjectId = catRes.body?.data?.[0]?.projectId;

  if (!validProjectId) {
    throw new Error('No published projects found for transaction testing');
  }

  // -------------------------------------------------------------------------
  // T04: Payload Validation and Boundary Constraints (HTTP 400 Bad Request)
  // -------------------------------------------------------------------------
  const invalidPayloadProbes = [
    {
      id: 'T04.1',
      desc: 'Monto cero (amountCents: 0)',
      body: { projectId: validProjectId, amountCents: 0 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.2',
      desc: 'Monto inferior al mínimo (amountCents: 99, menor a S/ 1.00)',
      body: { projectId: validProjectId, amountCents: 99 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.3',
      desc: 'Monto superior al límite (amountCents: 100001, mayor a S/ 1,000.00)',
      body: { projectId: validProjectId, amountCents: 100001 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.4',
      desc: 'Monto negativo (amountCents: -500)',
      body: { projectId: validProjectId, amountCents: -500 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.5',
      desc: 'Monto con decimales / float no entero (amountCents: 50.5)',
      body: { projectId: validProjectId, amountCents: 50.5 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.6',
      desc: 'Cuerpo sin campo amountCents',
      body: { projectId: validProjectId },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 400,
    },
    {
      id: 'T04.7',
      desc: 'Ausencia de cabecera Idempotency-Key',
      body: { projectId: validProjectId, amountCents: 5000 },
      headers: {},
      expectedStatus: 400,
    },
    {
      id: 'T04.8',
      desc: 'Cabecera Idempotency-Key no es un UUID válido (ej. "non-uuid-string")',
      body: { projectId: validProjectId, amountCents: 5000 },
      headers: { 'Idempotency-Key': 'non-uuid-string-12345' },
      expectedStatus: 400,
    },
    {
      id: 'T04.9',
      desc: 'Proyecto inexistente (UUID válido no registrado en base de datos)',
      body: { projectId: randomUUID(), amountCents: 5000 },
      headers: { 'Idempotency-Key': randomUUID() },
      expectedStatus: 404,
    },
  ];

  for (const probe of invalidPayloadProbes) {
    const res = await apiRequest('POST', '/v1/donations', {
      headers: {
        Authorization: `Bearer ${donor.accessToken}`,
        ...(probe.headers || {}),
      },
      body: probe.body,
    });

    const isMatch = res.status === probe.expectedStatus;
    reporter.assert(
      probe.id,
      `Validación de entrada: ${probe.desc} devuelve HTTP ${probe.expectedStatus}`,
      'CA-05.2, HU-05',
      isMatch,
      { status: res.status, expected: probe.expectedStatus, body: res.body }
    );
  }

  // -------------------------------------------------------------------------
  // T05: Valid Donation Intention Creation (HTTP 201 Created)
  // -------------------------------------------------------------------------
  const idempotencyKeyT05 = randomUUID();
  const validDonationPayload = {
    projectId: validProjectId,
    amountCents: 5000, // S/ 50.00
  };

  const createRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': idempotencyKeyT05,
    },
    body: validDonationPayload,
  });

  const createdData = createRes.body?.data;
  const t05Valid =
    createRes.status === 201 &&
    Boolean(createdData?.donationId) &&
    createdData?.status === 'PENDIENTE_SIMULACION' &&
    createdData?.amountCents === 5000 &&
    createdData?.currency === 'PEN' &&
    Boolean(createdData?.academicNotice);

  reporter.assert(
    'T05.1',
    'Donante registra intención válida con clave de idempotencia (HTTP 201, PENDIENTE_SIMULACION, sin cobro real)',
    'CA-05.1, CA-05.3, HU-05',
    t05Valid,
    { status: createRes.status, data: createdData }
  );

  const donationId = createdData?.donationId;

  // -------------------------------------------------------------------------
  // T06: Idempotent Replay with Identical Key and Payload (HTTP 201 Cached)
  // -------------------------------------------------------------------------
  const replayRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': idempotencyKeyT05,
    },
    body: validDonationPayload,
  });

  const t06Valid =
    (replayRes.status === 201 || replayRes.status === 200) &&
    replayRes.body?.data?.donationId === donationId &&
    replayRes.body?.data?.amountCents === 5000;

  reporter.assert(
    'T06.1',
    'Reenvío de solicitud con misma Idempotency-Key y payload idéntico devuelve resultado en caché sin duplicar donación',
    'CA-05.4, RNF-HU-04',
    t06Valid,
    { status: replayRes.status, replayedDonationId: replayRes.body?.data?.donationId, originalDonationId: donationId }
  );

  // -------------------------------------------------------------------------
  // T07: Idempotency Key Replay with Payload Mismatch (HTTP 409 Conflict)
  // -------------------------------------------------------------------------
  const conflictRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': idempotencyKeyT05,
    },
    body: {
      projectId: validProjectId,
      amountCents: 7500, // Altered amount from 5000 to 7500
    },
  });

  const t07Valid =
    conflictRes.status === 409 &&
    conflictRes.body?.code === 'CONFLICT' &&
    conflictRes.body?.message?.includes('parámetros diferentes');

  reporter.assert(
    'T07.1',
    'Reutilización de Idempotency-Key con payload modificado detecta colisión de hash SHA-256 y devuelve HTTP 409 Conflict',
    'CA-05.4, RNF-HU-04',
    t07Valid,
    { status: conflictRes.status, body: conflictRes.body }
  );

  // -------------------------------------------------------------------------
  // T08: Massive Concurrency (10 Simultaneous Confirmation Requests)
  // -------------------------------------------------------------------------
  // Create a brand new donation intention specifically for concurrency stress test
  const concKey = randomUUID();
  const concCreateRes = await apiRequest('POST', '/v1/donations', {
    headers: {
      Authorization: `Bearer ${donor.accessToken}`,
      'Idempotency-Key': concKey,
    },
    body: {
      projectId: validProjectId,
      amountCents: 5000, // S/ 50.00
    },
  });

  const concDonationId = concCreateRes.body?.data?.donationId;

  // Retrieve initial project financial statistics
  const statsBeforeRes = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const initialConfirmed = statsBeforeRes.body?.data?.confirmedAmountCents || 0;

  // Launch 10 simultaneous asynchronous requests confirming the same donation
  const concurrentCalls = Array.from({ length: 10 }, (_, i) =>
    apiRequest('POST', `/v1/donations/${concDonationId}/simulate`, {
      headers: { Authorization: `Bearer ${donor.accessToken}` },
      body: { action: 'CONFIRMAR' },
    })
  );

  const concurrencyResponses = await Promise.all(concurrentCalls);

  const count200 = concurrencyResponses.filter((r) => r.status === 200).length;
  const count409 = concurrencyResponses.filter((r) => r.status === 409).length;

  reporter.assert(
    'T08.1',
    'Concurrencia masiva: 10 solicitudes paralelas de confirmación devuelven exactamente un HTTP 200 y 9 HTTP 409',
    'CA-06.2, CA-NF04.1',
    count200 === 1 && count409 === 9,
    { count200, count409, total: concurrencyResponses.length }
  );

  // Verify that the project goal/confirmed balance was incremented exactly once (5000 cents)
  const statsAfterRes = await apiRequest('GET', `/v1/projects/${validProjectId}/stats`);
  const finalConfirmed = statsAfterRes.body?.data?.confirmedAmountCents || 0;
  const balanceDelta = finalConfirmed - initialConfirmed;

  reporter.assert(
    'T08.2',
    'Atomicidad en DynamoDB: El monto confirmado del proyecto se incrementa exactamente una sola vez (delta = 5000 céntimos)',
    'CA-06.2, CA-NF04.1, CA-NF04.2',
    balanceDelta === 5000,
    { initialConfirmed, finalConfirmed, delta: balanceDelta, expectedDelta: 5000 }
  );

  // -------------------------------------------------------------------------
  // T10: AWS IAM Least Privilege Guardrail (RNF-HU-03 / CA-NF03.1)
  // -------------------------------------------------------------------------
  const iamSimResult = simulateReadOnlyPolicy();

  reporter.assert(
    'T10.1',
    'Simulación de política IAM: Rol de lectura ListProjectsFunctionRole tiene permitido dynamodb:GetItem, Query y Scan',
    'CA-NF03.1, RNF-HU-03',
    iamSimResult.success && iamSimResult.readAllowed,
    { roleName: iamSimResult.roleName, results: iamSimResult.resultMap }
  );

  reporter.assert(
    'T10.2',
    'Guardrail de mínimo privilegio: Acciones de mutación (PutItem, UpdateItem, DeleteItem) son denegadas con implicitDeny en roles de lectura',
    'CA-NF03.1, RNF-HU-03',
    iamSimResult.success && iamSimResult.writeDenied,
    { roleName: iamSimResult.roleName, results: iamSimResult.resultMap }
  );

  return reporter.summary();
}

// Allow direct standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTier4Tests()
    .then((summary) => process.exit(summary.failed === 0 ? 0 : 1))
    .catch((err) => {
      console.error('Fatal execution error in Tier 4:', err);
      process.exit(1);
    });
}
