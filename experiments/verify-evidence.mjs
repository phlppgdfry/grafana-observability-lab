import assert from 'node:assert/strict';

export function verifyEvidence({ phase, traceId, trace, logs }) {
  const spans = trace.resourceSpans.flatMap(r => r.scopeSpans.flatMap(s => s.spans));
  const root = spans.find(s => s.kind === 'SPAN_KIND_SERVER');
  assert.ok(root, 'HTTP server span must exist');
  const durationMs = span => Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6;
  const expectedStatus = phase === 'error' ? '500' : phase === 'invalid-input' ? '400' : '200';
  assert.equal(root.attributes.find(a => a.key === 'http.response.status_code')?.value.intValue, expectedStatus);
  assert.equal(spans.length, phase === 'invalid-input' ? 4 : 5);
  for (const span of spans) {
    assert.equal(Buffer.from(span.traceId, 'base64').toString('hex'), traceId);
    assert.ok(durationMs(span) >= 0);
    if (span !== root) assert.equal(span.parentSpanId, root.spanId);
  }
  const processing = spans.find(s => s.name === 'document.process');
  if (phase === 'error') {
    assert.equal(root.status.code, 'STATUS_CODE_ERROR');
    assert.equal(processing.status.code, 'STATUS_CODE_ERROR');
  } else {
    assert.ok(spans.every(s => s.status?.code !== 'STATUS_CODE_ERROR'));
  }
  if (phase === 'slow') {
    assert.ok(durationMs(processing) >= 350, 'Injected delay must appear inside document.process');
    assert.ok(durationMs(processing) / durationMs(root) > 0.85, 'Processing must dominate the slow trace');
  }
  if (phase === 'recovered') assert.ok(durationMs(processing) < 250, 'Processing must return below the lab latency threshold');
  const entries = logs.flatMap(stream => stream.values);
  assert.equal(entries.length, 1, 'One correlated request log expected');
  const metadata = entries[0].structuredMetadata;
  assert.equal(metadata.trace_id, traceId);
  assert.equal(metadata.http_response_status_code, expectedStatus);
  assert.equal(metadata.severity_text, phase === 'error' ? 'ERROR' : phase === 'invalid-input' ? 'WARN' : 'INFO');
  assert.equal(metadata.span_id, Buffer.from(root.spanId, 'base64').toString('hex'));
  assert.ok(!JSON.stringify({ trace, logs }).includes('Controlled day-10 failure'), 'Internal exception text must not leak');
  return { phase, traceId, status: Number(expectedStatus), spans: spans.length,
    rootDurationMs: durationMs(root), processingDurationMs: processing ? durationMs(processing) : null,
    severity: metadata.severity_text };
}
