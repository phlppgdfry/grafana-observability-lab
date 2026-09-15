export function assessUsage(budget, result) {
  if (!Array.isArray(result)) throw new Error('Expected an instant-vector result');
  return budget.items.map(item => {
    const samples = result.filter(r => r.metric?.__name__ === item.metric);
    // Never interpret missing, duplicated, stale or malformed data as zero usage.
    const raw = samples.length === 1 ? samples[0].value?.[1] : undefined;
    const value = typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    const timestamp = samples.length === 1 ? Number(samples[0].value?.[0]) : NaN;
    const known = Number.isFinite(value) && value >= 0 && Number.isFinite(timestamp)
      && Math.abs(Date.now() / 1000 - timestamp) < 900;
    const percent = known ? value / item.freeLimit * 100 : null;
    return { name: item.name, metric: item.metric, unit: item.unit, freeLimit: item.freeLimit,
      value: known ? value : null, percent, status: !known ? 'unknown' : percent >= budget.warningPercent ? 'review' : 'within-budget' };
  });
}
