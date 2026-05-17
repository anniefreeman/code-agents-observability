import 'dotenv/config';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Export to a local OTel Collector (see docker-compose.yml + otel-collector-config.yaml).
// The collector synthesises span-metrics via the `spanmetrics` connector — those derived
// series are what Coralogix's APM Service Catalog reads, so direct-to-ingress would
// land spans but leave the Service Catalog empty.
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'sessions-api';

type LogLevelKey = keyof typeof DiagLogLevel;
const levelKey = (process.env.OTEL_LOG_LEVEL || 'WARN').toUpperCase() as LogLevelKey;
const OTEL_LOG_LEVEL = DiagLogLevel[levelKey] ?? DiagLogLevel.WARN;
diag.setLogger(new DiagConsoleLogger(), OTEL_LOG_LEVEL);

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${OTLP_ENDPOINT}/v1/metrics` }),
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({ url: `${OTLP_ENDPOINT}/v1/logs` })
    ),
  ],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log(
  `[telemetry] OpenTelemetry started — ${SERVICE_NAME} → ${OTLP_ENDPOINT} (traces + metrics + logs)`
);

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
