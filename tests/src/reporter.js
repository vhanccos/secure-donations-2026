/**
 * Structured Test Reporter and Assertion Engine
 * Formats tests, tiers, and outputs exit codes.
 */

export class TestReporter {
  constructor(suiteName = 'Test Suite') {
    this.suiteName = suiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  assert(id, scenario, requirementTrace, condition, details = {}) {
    const passed = Boolean(condition);
    const entry = {
      id,
      scenario,
      requirementTrace,
      passed,
      details,
      timestamp: new Date().toISOString(),
    };
    this.results.push(entry);

    const mark = passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✖ FAIL\x1b[0m';
    const idFormatted = `\x1b[1m[${id}]\x1b[0m`;
    const traceFormatted = `\x1b[36m(${requirementTrace})\x1b[0m`;

    console.log(`  ${mark} ${idFormatted} ${scenario} ${traceFormatted}`);
    if (!passed) {
      console.error('    \x1b[33mError Details:\x1b[0m', JSON.stringify(details, null, 2));
    }

    return passed;
  }

  section(title) {
    console.log(`\n\x1b[1;34m=== ${title} ===\x1b[0m`);
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n' + '─'.repeat(72));
    console.log(`\x1b[1mSUITE SUMMARY: ${this.suiteName}\x1b[0m`);
    console.log(`  Total:    ${total}`);
    console.log(`  Passed:   \x1b[32m${passed}\x1b[0m`);
    console.log(`  Failed:   ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Verdict:  ${failed === 0 ? '\x1b[32mPASSED (100% OK)\x1b[0m' : '\x1b[31mFAILED\x1b[0m'}`);
    console.log('─'.repeat(72) + '\n');

    return { total, passed, failed, duration, results: this.results };
  }
}
