const { test } = require('node:test');
const assert = require('node:assert/strict');

const report = (severity, source = 123) => ({ auditReportVersion: 2, vulnerabilities: {
  example: { severity, via: [{ source, severity }] },
} });

test('dependency gate blocks newly introduced advisories and severity escalations', async () => {
  const { highFindings, introducedFindings } = await import('../scripts/audit-dependencies.mjs');
  const base = highFindings(report('high'));
  assert.deepEqual(introducedFindings(highFindings(report('high')), base), []);
  assert.equal(introducedFindings(highFindings(report('high', 456)), base).length, 1);
  assert.equal(introducedFindings(highFindings(report('critical')), base).length, 1);
  assert.equal(introducedFindings(base, new Map()).length, 1);
  assert.equal(highFindings(report('moderate')).size, 0);
});

test('dependency gate rejects unusable advisory responses and preserves transitive warnings', async () => {
  const { highFindings } = await import('../scripts/audit-dependencies.mjs');
  assert.throws(() => highFindings({ error: { code: 'ENETWORK' } }));
  assert.throws(() => highFindings(report('high', 'invalid')));
  const transitive = report('high');
  transitive.vulnerabilities.example.via = ['another-package'];
  assert.equal(highFindings(transitive).get('example:transitive'), 'high');
});
