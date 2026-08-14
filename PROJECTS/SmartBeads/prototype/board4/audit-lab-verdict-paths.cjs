'use strict';
/**
 * Static audit: prove exactly one authoritative board verdict path per Lab family.
 * Compare scripts must NOT emit KEEP/REJECT/NEEDS FURTHER TESTING.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const VERDICT_RE = /\b(KEEP|REJECT|NEEDS FURTHER TESTING)\b/;
const EMIT_PATTERNS = [
  /candidateVerdict\s*:/,
  /selectionVerdict\s*:/,
  /compareScriptVerdict/,
  /decideVerdict\s*\(/,
  /function\s+ladderVerdict/,
];

const AUTHORITATIVE = {
  sholo: ['evaluate-ladder-lab.cjs'],
  cursorIndex: ['evaluate-cursor-index-lab.cjs'],
};

const METRICS_ONLY_COMPARE = [
  'compare-sholo-5-vs-16-lab.cjs',
  'compare-sholo-6-vs-16-lab.cjs',
  'compare-sholo-7-vs-16-lab.cjs',
  'compare-sholo-8-vs-16-lab.cjs',
  'compare-sholo-10-vs-16-lab.cjs',
];

function scanFile(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const hits = [];
  for (const pat of EMIT_PATTERNS) {
    if (pat.test(text)) hits.push(String(pat));
  }
  const hasVerdictStrings = VERDICT_RE.test(text);
  return { file, hits, hasVerdictStrings, lines: text.split('\n').length };
}

function main() {
  const cjs = fs.readdirSync(ROOT).filter((f) => f.endsWith('.cjs'));
  const scans = cjs.map(scanFile);
  const issues = [];

  for (const f of METRICS_ONLY_COMPARE) {
    const s = scans.find((x) => x.file === f);
    if (!s) {
      issues.push({ file: f, issue: 'missing compare script' });
      continue;
    }
    if (s.hits.some((h) => h.includes('decideVerdict') || h.includes('candidateVerdict'))) {
      issues.push({ file: f, issue: 'compare script still emits board verdicts', hits: s.hits });
    }
  }

  for (const f of AUTHORITATIVE.sholo) {
    const s = scans.find((x) => x.file === f);
    if (!s || !s.hits.some((h) => h.includes('selectionVerdict'))) {
      issues.push({ file: f, issue: 'authoritative Sholo evaluator missing selectionVerdict output' });
    }
  }

  const rogue = scans.filter((s) => {
    if (METRICS_ONLY_COMPARE.includes(s.file)) return false;
    if ([...AUTHORITATIVE.sholo, ...AUTHORITATIVE.cursorIndex].flat().includes(s.file)) return false;
    if (s.file === 'sholo-lab-gates.cjs') return false;
    if (s.file === 'audit-lab-verdict-paths.cjs') return false;
    if (s.file.startsWith('audit-') && s.file.includes('fairness')) return false;
    return s.hits.some((h) => h.includes('candidateVerdict') || h.includes('decideVerdict'));
  });

  for (const r of rogue) {
    issues.push({ file: r.file, issue: 'unexpected verdict emitter', hits: r.hits });
  }

  // Stale JSON artifacts
  const staleJson = [];
  for (const j of fs.readdirSync(ROOT).filter((f) => f.endsWith('_COMPARE.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, j), 'utf8'));
    if (data.candidateVerdict != null) {
      staleJson.push({ file: j, candidateVerdict: data.candidateVerdict, n: data.protocol && (data.protocol.nPerSeedPerDepth || data.protocol.nPerSeed) });
    }
  }

  const protocol = require('./sholo-lab-protocol.cjs');
  const refPath = path.join(ROOT, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');
  let refN = null;
  if (fs.existsSync(refPath)) {
    const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
    refN = ref.baselineProtocol && ref.baselineProtocol.nPerSeed;
  }

  const report = {
    purpose: 'Verdict-path audit — one authoritative evaluator per Lab family',
    authoritativeEvaluators: AUTHORITATIVE,
    metricsOnlyCompareScripts: METRICS_ONLY_COMPARE,
    scriptIssues: issues,
    rogueVerdictEmitters: rogue.map((r) => r.file),
    staleCompareJsonWithLegacyVerdict: staleJson,
    canonicalN: protocol.N_PER_SEED,
    referenceValidationN: refN,
    nConsistent: refN === protocol.N_PER_SEED,
    codeVerdictPathClean: issues.length === 0,
    note:
      staleJson.length
        ? 'Legacy compare JSON may retain candidateVerdict until candidate boards are re-tested at canonical N.'
        : 'All compare JSON artifacts are metrics-only.',
    verdict: issues.length === 0 ? 'CODE_PATHS_OK' : 'CODE_PATHS_FAIL',
  };

  const out = path.join(ROOT, 'LAB_VERDICT_PATH_AUDIT.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(issues.length ? 7 : 0);
}

main();
