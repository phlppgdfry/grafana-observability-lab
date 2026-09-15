import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyEvidence } from '../experiments/verify-evidence.mjs';

const fixture = JSON.parse(readFileSync(new URL('../docs/evidence/day-09-correlation.json', import.meta.url)));
test('fault diagnosis accepts a real recovered trace and rejects mismatched correlation', () => {
  const evidence = { ...structuredClone(fixture), phase: 'recovered' };
  assert.equal(verifyEvidence(evidence).severity, 'INFO');
  evidence.logs[0].values[0].structuredMetadata.trace_id = '0'.repeat(32);
  assert.throws(() => verifyEvidence(evidence));
});
test('a fast successful trace cannot prove injected delay or a processing failure', () => {
  assert.throws(() => verifyEvidence({ ...fixture, phase: 'slow' }));
  assert.throws(() => verifyEvidence({ ...fixture, phase: 'error' }));
});
