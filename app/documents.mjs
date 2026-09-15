import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

export class InputError extends Error {
  constructor(status, reason, message) { super(message); this.status = status; this.reason = reason; }
}
async function step(name, work, signal) {
  return trace.getTracer('document-lab.processing').startActiveSpan(name, { kind: SpanKind.INTERNAL }, async span => {
    try {
      const result = await work();
      span.setAttribute('operation.outcome', 'completed');
      return result;
    } catch (error) {
      const reason = signal?.aborted ? 'client_disconnect' : error instanceof InputError ? error.reason : 'internal_error';
      span.setAttribute('operation.outcome', reason);
      if (!(error instanceof InputError)) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.setAttribute('error.type', reason);
      }
      // Never export arbitrary exception messages or document data.
      throw error;
    } finally { span.end(); }
  });
}
export async function simulateProcessing(signal) {
  await sleep(40, undefined, { signal });
  return randomUUID();
}
export async function processDocumentRequest(req, processDocument = simulateProcessing, signal) {
  const body = await step('document.read_body', async () => {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) throw new InputError(413, 'payload_too_large', 'Payload too large');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  });
  const input = await step('document.parse_json', () => {
    try { return JSON.parse(body); }
    catch { throw new InputError(400, 'invalid_json', 'Invalid JSON request'); }
  });
  await step('document.validate', () => {
    if (typeof input?.name !== 'string' || !input.name.trim() || input.name.length > 120) {
      throw new InputError(400, 'invalid_name', 'name must be a non-empty string of at most 120 characters');
    }
  });
  return step('document.process', async () => {
    trace.getActiveSpan()?.setAttribute('document.processing.mode', 'simulation');
    signal?.throwIfAborted();
    return processDocument(signal);
  }, signal);
}
