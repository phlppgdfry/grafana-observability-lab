import { readFileSync } from 'node:fs';
import { resourceFromAttributes } from '@opentelemetry/resources';
export const serviceAttributes = {
  'service.name': process.env.OTEL_SERVICE_NAME || 'document-lab',
  'service.version': JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version,
  'deployment.environment.name': process.env.DEPLOYMENT_ENVIRONMENT || 'lab',
};
export const resource = resourceFromAttributes(serviceAttributes);
export function cloudHeaders() {
  if (!process.env.GRAFANA_CLOUD_TOKEN_FILE) return {};
  const token = readFileSync(process.env.GRAFANA_CLOUD_TOKEN_FILE, 'utf8').trim();
  if (!token || /\s/.test(token) || !process.env.GRAFANA_CLOUD_STACK_ID) throw new Error('Invalid local Grafana telemetry configuration');
  return { Authorization: `Basic ${Buffer.from(`${process.env.GRAFANA_CLOUD_STACK_ID}:${token}`).toString('base64')}` };
}
