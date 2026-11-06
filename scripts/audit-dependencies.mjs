import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ranks = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

// Package + advisory ID remains stable when npm moves a vulnerable transitive
// package between paths. A severity escalation is a new finding.
export function highFindings(report) {
  if (report?.auditReportVersion !== 2 || !report.vulnerabilities || report.error) {
    throw new Error('Unusable npm audit response');
  }
  const findings = new Map();
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!Array.isArray(vulnerability.via) || !(vulnerability.severity in ranks)) {
      throw new Error('Invalid npm advisory metadata');
    }
    if (ranks[vulnerability.severity] < ranks.high) continue;
    const advisories = vulnerability.via.filter((item) => typeof item === 'object');
    if (!advisories.length) {
      // npm also reports meta-vulnerabilities with only package references.
      findings.set(`${name}:transitive`, vulnerability.severity);
    }
    for (const advisory of advisories) {
      if (!Number.isInteger(advisory.source) || !(advisory.severity in ranks)) {
        throw new Error('Invalid npm advisory identity');
      }
      if (ranks[advisory.severity] >= ranks.high) {
        findings.set(`${name}:${advisory.source}`, advisory.severity);
      }
    }
  }
  return findings;
}

export function introducedFindings(head, base) {
  return [...head].filter(([id, severity]) => ranks[severity] > (ranks[base.get(id)] ?? -1));
}

function audit(cwd) {
  const result = spawnSync('npm', ['audit', '--package-lock-only', '--ignore-scripts', '--json'], {
    cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status)) throw new Error('npm audit failed to run');
  return highFindings(JSON.parse(result.stdout));
}

function main() {
  const head = audit(process.cwd());
  const baseSha = process.env.AUDIT_BASE_SHA;
  let base = new Map();
  if (baseSha) {
    if (!/^[a-f0-9]{40}$/.test(baseSha)) throw new Error('Invalid base commit SHA');
    const directory = mkdtempSync(path.join(tmpdir(), 'fintechnav-audit-'));
    try {
      for (const file of ['package.json', 'package-lock.json']) {
        writeFileSync(path.join(directory, file), execFileSync('git', ['show', `${baseSha}:${file}`]));
      }
      // Audit only the base lockfile; never install or execute base code.
      base = audit(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
  const introduced = introducedFindings(head, base);
  console.log(`High/critical advisories: ${head.size}; pre-existing: ${head.size - introduced.length}; blocking: ${introduced.length}`);
  for (const [id, severity] of head) console.log(`${severity}: ${id}`);
  if (introduced.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) {
    console.error(`Dependency audit failed closed: ${error.message}`);
    process.exitCode = 1;
  }
}
