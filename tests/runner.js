/**
 * Master E2E Test Suite Runner
 * Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)
 * Executes Tiers 1-4 covering all acceptance scenarios T01 to T14.
 */

import { runTier1Tests } from './e2e/tier1-public-discovery.test.js';
import { runTier2Tests } from './e2e/tier2-auth-security.test.js';
import { runTier3Tests } from './e2e/tier3-rbac-bola.test.js';
import { runTier4Tests } from './e2e/tier4-integrity-concurrency.test.js';
import { CONFIG } from './src/config.js';

async function main() {
  const globalStartTime = Date.now();

  console.log('\n' + '═'.repeat(78));
  console.log('   FUNDACIÓN AQP-SOLIDARIA — AUTOMATED E2E ZERO TRUST TEST SUITE');
  console.log('   NIST SP 800-207 Conformance & OWASP Top 10 API Security Verification');
  console.log('═'.repeat(78));
  console.log(` Target API:       ${CONFIG.API_BASE_URL}`);
  console.log(` Cognito Domain:   ${CONFIG.COGNITO_DOMAIN}`);
  console.log(` User Pool ID:     ${CONFIG.COGNITO_USER_POOL_ID}`);
  console.log(` App Client ID:    ${CONFIG.COGNITO_CLIENT_ID}`);
  console.log(` AWS Region:       ${CONFIG.AWS_REGION}`);
  console.log('═'.repeat(78));

  const allTierResults = [];

  try {
    // Execute Tier 1
    const t1 = await runTier1Tests();
    allTierResults.push({ name: 'Tier 1: Public Discovery & Catalog', ...t1 });

    // Execute Tier 2
    const t2 = await runTier2Tests();
    allTierResults.push({ name: 'Tier 2: Authentication & Token Security', ...t2 });

    // Execute Tier 3
    const t3 = await runTier3Tests();
    allTierResults.push({ name: 'Tier 3: RBAC & BOLA / IDOR Defense', ...t3 });

    // Execute Tier 4
    const t4 = await runTier4Tests();
    allTierResults.push({ name: 'Tier 4: Integrity, Idempotency & Concurrency', ...t4 });

    const totalDuration = ((Date.now() - globalStartTime) / 1000).toFixed(2);
    const allTests = allTierResults.flatMap((t) => t.results);
    const totalCount = allTests.length;
    const passedCount = allTests.filter((r) => r.passed).length;
    const failedCount = totalCount - passedCount;

    console.log('\n' + '═'.repeat(78));
    console.log('                      MASTER VERIFICATION MATRIX');
    console.log('═'.repeat(78));
    console.log(
      ' ID     │ Scenario Description                                  │ Trace        │ Result'
    );
    console.log('─'.repeat(78));

    for (const res of allTests) {
      const idCol = res.id.padEnd(6).slice(0, 6);
      const descCol = res.scenario.padEnd(46).slice(0, 46);
      const traceCol = res.requirementTrace.padEnd(12).slice(0, 12);
      const statusCol = res.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(` ${idCol} │ ${descCol} │ ${traceCol} │ ${statusCol}`);
    }

    console.log('═'.repeat(78));
    console.log('                     FINAL TEST SUITE SUMMARY');
    console.log('═'.repeat(78));
    for (const tier of allTierResults) {
      const tierStatus =
        tier.failed === 0
          ? `\x1b[32m${tier.passed}/${tier.total} PASS\x1b[0m`
          : `\x1b[31m${tier.failed} FAIL\x1b[0m`;
      console.log(` • ${tier.name.padEnd(48)}: ${tierStatus} (${tier.duration}s)`);
    }
    console.log('─'.repeat(78));
    console.log(` Total Scenarios Executed:  ${totalCount}`);
    console.log(` Passed:                    \x1b[32m${passedCount}\x1b[0m`);
    console.log(` Failed:                    ${failedCount > 0 ? `\x1b[31m${failedCount}\x1b[0m` : '0'}`);
    console.log(` Success Rate:              ${((passedCount / totalCount) * 100).toFixed(1)}%`);
    console.log(` Overall Execution Time:    ${totalDuration}s`);
    console.log(` Final Verdict:             ${failedCount === 0 ? '\x1b[32mALL TESTS PASSED (APPROVED)\x1b[0m' : '\x1b[31mTESTS FAILED (REJECTED)\x1b[0m'}`);
    console.log('═'.repeat(78) + '\n');

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('\n\x1b[31mFATAL TEST RUNNER ERROR:\x1b[0m', err);
    process.exit(1);
  }
}

main();
