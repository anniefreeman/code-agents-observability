require('dotenv').config();

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Surface OTel internals (export failures, dropped spans, etc.) on the server console
// so silent observability problems are visible without needing to query the backend.
const OTEL_LOG_LEVEL =
  DiagLogLevel[(process.env.OTEL_LOG_LEVEL || 'WARN').toUpperCase()] ?? DiagLogLevel.WARN;
diag.setLogger(new DiagConsoleLogger(), OTEL_LOG_LEVEL);

const CX_DOMAIN = process.env.CX_DOMAIN || 'eu1.coralogix.com';
const CX_PRIVATE_KEY = process.env.CX_PRIVATE_KEY;
const APP_NAME = process.env.CX_APPLICATION_NAME || 'code-agents-observability';
const SUBSYSTEM_NAME =
  process.env.CX_SUBSYSTEM_NAME || process.env.OTEL_SERVICE_NAME || 'sessions-api';

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
