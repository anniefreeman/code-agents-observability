import 'dotenv/config';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const CX_DOMAIN = process.env.CX_DOMAIN || 'eu1.coralogix.com';
const CX_PRIVATE_KEY = process.env.CX_PRIVATE_KEY;
const APP_NAME = process.env.CX_APPLICATION_NAME || 'code-agents-observability';
const SUBSYSTEM_NAME =
  process.env.CX_SUBSYSTEM_NAME || process.env.OTEL_SERVICE_NAME || 'sessions-api';

// Surface OTel internals (export failures, dropped spans, etc.) on the server console
// so silent observability problems are visible without needing to query the backend.
type LogLevelKey = keyof typeof DiagLogLevel;
const levelKey = (process.env.OTEL_LOG_LEVEL || 'WARN').toUpperCase() as LogLevelKey;
const OTEL_LOG_LEVEL = DiagLogLevel[levelKey] ?? DiagLogLevel.WARN;
diag.setLogger(new DiagConsoleLogger(), OTEL_LOG_LEVEL);

if (!CX_PRIVATE_KEY) {
  console.warn('[tracing] CX_PRIVATE_KEY not set — traces will not be authenticated');
}

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `https://ingress.${CX_DOMAIN}/v1/traces`,
    headers: {
      Authorization: `Bearer ${CX_PRIVATE_KEY}`,
      'cx-application-name': APP_NAME,
      'cx-subsystem-name': SUBSYSTEM_NAME,
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log(
  `[tracing] OpenTelemetry started — ${APP_NAME}/${SUBSYSTEM_NAME} → ${CX_DOMAIN}`
);

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
