/**
 * Interactive Single Acceptance Test Runner (T01 - T14)
 * Plataforma de Donaciones Seguras — «Fundación AQP-SOLIDARIA»
 *
 * Usage:
 *   node tests/run-single-test.js T01
 *   node tests/run-single-test.js T02
 *   ...
 *   node tests/run-single-test.js --list
 */

import { runTier1Tests } from './e2e/tier1-public-discovery.test.js';
import { runTier2Tests } from './e2e/tier2-auth-security.test.js';
import { runTier3Tests } from './e2e/tier3-rbac-bola.test.js';
import { runTier4Tests } from './e2e/tier4-integrity-concurrency.test.js';
import { CONFIG } from './src/config.js';

const T_DEFINITIONS = {
  T01: {
    tier: 1,
    title: 'Visitante consulta catálogo público y proyectos',
    trace: 'CA-01.1, CA-01.2, CA-02.1, CA-02.2, HU-01, HU-02, HU-09',
    expected: 'HTTP 200 para publicados, HTTP 404 para borradores o IDs inexistentes, cabeceras Zero Trust',
  },
  T02: {
    tier: 2,
    title: 'Sin token Bearer intenta acceder a endpoints protegidos (PEP Gate)',
    trace: 'CA-03.2, RNF-HU-02',
    expected: 'HTTP 401 Unauthorized bloqueado en API Gateway antes de invocar cómputo Lambda',
  },
  T03: {
    tier: 3,
    title: 'Donante intenta crear o publicar proyectos sociales',
    trace: 'CA-04.1, HU-04',
    expected: 'HTTP 403 Forbidden por falta de rol GESTOR y scope api/projects.write',
  },
  T04: {
    tier: 4,
    title: 'Validación de entrada: Monto 0, negativo, no entero o > S/ 1,000.00',
    trace: 'CA-05.2, HU-05',
    expected: 'HTTP 400 Bad Request validado con esquemas Zod en Lambda PDP',
  },
  T05: {
    tier: 4,
    title: 'Donante crea intención de donación válida con llave de idempotencia',
    trace: 'CA-05.1, CA-05.3, HU-05',
    expected: 'HTTP 201 Created, estado PENDIENTE_SIMULACION, sin cobro financiero real',
  },
  T06: {
    tier: 4,
    title: 'Idempotencia atómica: Reintento con misma clave y payload idéntico',
    trace: 'CA-05.4, RNF-HU-04',
    expected: 'HTTP 201 en caché, misma donación retornada, exactamente un registro en base de datos',
  },
  T07: {
    tier: 4,
    title: 'Detección de colisión: Reutilización de clave con payload modificado',
    trace: 'CA-05.4, RNF-HU-04',
    expected: 'HTTP 409 Conflict detectado por discrepancia de hash criptográfico SHA-256',
  },
  T08: {
    tier: 4,
    title: 'Concurrencia masiva: 10 confirmaciones paralelas de la misma donación',
    trace: 'CA-06.2, CA-NF04.1',
    expected: 'Exactamente 1 confirmación exitosa y 9 rechazadas con HTTP 409 (delta = monto exacto)',
  },
  T09: {
    tier: 3,
    title: 'Ataque BOLA/IDOR: Donante intenta manipular o leer donación ajena',
    trace: 'CA-07.1, CA-07.2, HU-07',
    expected: 'HTTP 403/404 sin filtración; el claim sub gobierna la autorización en DynamoDB',
  },
  T10: {
    tier: 4,
    title: 'Mínimo privilegio IAM: Lambda de lectura intenta mutar tablas DynamoDB',
    trace: 'CA-NF03.1, RNF-HU-03',
    expected: 'AccessDenied / implicitDeny simulado en IAM Policy Simulator para mutaciones',
  },
  T11: {
    tier: 2,
    title: 'Token alterado, firma corrupta, alg:none o ID Token usado como Bearer',
    trace: 'CA-03.2, CA-NF02.1',
    expected: 'HTTP 401 Unauthorized en PEP o HTTP 403 por ausencia de custom scopes OAuth',
  },
  T12: {
    tier: 3,
    title: 'Segregación de roles: Gestor consulta historial de donante o auditoría',
    trace: 'CA-04.2, CA-10.1, HU-04, HU-10',
    expected: 'HTTP 403 Forbidden mutuo; estricta segregación de funciones (SoD)',
  },
  T13: {
    tier: 2,
    title: 'Ciclo de vida de tokens: Expiración en el pasado y revocación OAuth',
    trace: 'CA-03.3, CA-03.4',
    expected: 'HTTP 401 para expirados; invalid_grant tras revocación en /oauth2/revoke',
  },
  T14: {
    tier: 2,
    title: 'MFA obligatorio: Usuario privilegiado (GESTOR/AUDITOR) sin TOTP',
    trace: 'CA-11.1, CA-11.2, HU-11',
    expected: 'Cognito emite desafío SOFTWARE_TOKEN_MFA sin entregar tokens de acceso',
  },
};

async function executeTest(testId) {
  const normId = testId.toUpperCase();
  const def = T_DEFINITIONS[normId];
  if (!def) {
    console.error(`\x1b[31mError: Caso de prueba ${testId} no reconocido.\x1b[0m`);
    console.log('Casos válidos: T01 a T14. Usa --list para ver detalles.');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(78));
  console.log(`   EJECUCIÓN INDIVIDUAL DE CASO DE ACEPTACIÓN — [${normId}]`);
  console.log('   NIST SP 800-207 Zero Trust Architecture Verification');
  console.log('═'.repeat(78));
  console.log(` Escenario:    ${def.title}`);
  console.log(` Trazabilidad: ${def.trace}`);
  console.log(` Esperado:     ${def.expected}`);
  console.log(` API Endpoint: ${CONFIG.API_BASE_URL}`);
  console.log('═'.repeat(78) + '\n');

  let tierResult;
  const start = Date.now();

  // Clean output: suppress noisy intermediate tier logs so the terminal output is crystal-clear for screenshots
  const origLog = console.log;
  console.log = (...args) => {
    const msg = args.join(' ');
    if (msg.includes('=== TIER') || msg.includes('SUITE SUMMARY') || msg.includes('───')) return;
    if (msg.includes('✔ PASS') || msg.includes('✖ FAIL')) return;
    if (msg.includes('Total:') || msg.includes('Passed:') || msg.includes('Failed:') || msg.includes('Duration:') || msg.includes('Verdict:')) return;
    origLog(...args);
  };

  switch (def.tier) {
    case 1:
      tierResult = await runTier1Tests();
      break;
    case 2:
      tierResult = await runTier2Tests();
      break;
    case 3:
      tierResult = await runTier3Tests();
      break;
    case 4:
      tierResult = await runTier4Tests();
      break;
  }

  console.log = origLog;

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  // Filter only matching tests
  const matchingTests = tierResult.results.filter(
    (t) => t.id.startsWith(normId) || t.id.startsWith(`${normId}.`) || (normId === 'T11' && t.id.startsWith('T11.ID'))
  );

  console.log('\n' + '═'.repeat(78));
  console.log(`                 EVIDENCIA TÉCNICA DEL CASO ${normId}`);
  console.log('═'.repeat(78));
  console.log(' ID           │ Sub-escenario Evaluado en Vivo AWS                │ Resultado');
  console.log('─'.repeat(78));

  let allPass = true;
  for (const t of matchingTests) {
    const idCol = t.id.padEnd(11).slice(0, 11);
    const descCol = t.scenario.padEnd(49).slice(0, 49);
    const resCol = t.passed ? '\x1b[32m✔ PASS (CUMPLE)\x1b[0m' : '\x1b[31m✖ FAIL (RECHAZADO)\x1b[0m';
    if (!t.passed) allPass = false;
    console.log(` ${idCol} │ ${descCol} │ ${resCol}`);
  }

  console.log('═'.repeat(78));
  console.log(` Sub-escenarios: ${matchingTests.length} verificados`);
  console.log(` Veredicto Final: ${allPass ? '\x1b[32mAPROBADO (100% CONFORME NIST & REQUIREMENTS.MD)\x1b[0m' : '\x1b[31mRECHAZADO\x1b[0m'}`);
  console.log(` Tiempo de Respuesta AWS: ${duration}s`);
  console.log('═'.repeat(78) + '\n');
}

function listTests() {
  console.log('\n' + '═'.repeat(78));
  console.log('         MATRIZ DE CASOS DE PRUEBA DE ACEPTACIÓN (REQUIREMENTS.MD §6)');
  console.log('═'.repeat(78));
  console.log(' ID  │ Escenario Principal                                  │ Trazabilidad');
  console.log('─'.repeat(78));
  for (const [id, def] of Object.entries(T_DEFINITIONS)) {
    console.log(` ${id} │ ${def.title.padEnd(52).slice(0, 52)} │ ${def.trace.slice(0, 18)}`);
  }
  console.log('═'.repeat(78));
  console.log(' Para ejecutar un test individual y capturar su screenshot:');
  console.log('   node tests/run-single-test.js T02');
  console.log('   node tests/run-single-test.js T03\n');
}

const arg = process.argv[2];
if (!arg || arg === '--help' || arg === '-h' || arg === '--list') {
  listTests();
} else {
  executeTest(arg);
}
