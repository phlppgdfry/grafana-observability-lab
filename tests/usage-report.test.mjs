import test from 'node:test';
import assert from 'node:assert/strict';
import { assessUsage } from '../telemetry/usage-report.mjs';
const budget = { warningPercent: 80, items: [{ name: 'logs', metric: 'usage', unit: 'GB', freeLimit: 50 }] };
const sample = value => ({ metric: { __name__: 'usage' }, value: [Date.now() / 1000, String(value)] });
test('usage assessment distinguishes zero, threshold crossing, and unavailable data', () => {
  assert.equal(assessUsage(budget, [sample(0)])[0].status, 'within-budget');
  assert.equal(assessUsage(budget, [sample(40)])[0].status, 'review');
  for (const input of [[], [sample('')], [sample('NaN')], [sample(-1)], [sample(1), sample(1)], [{ ...sample(1), value: [0, '1'] }]]) {
    assert.equal(assessUsage(budget, input)[0].status, 'unknown');
    assert.equal(assessUsage(budget, input)[0].value, null);
  }
});
