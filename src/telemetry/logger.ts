import pino from 'pino';

// Single shared pino instance. The auto-instrumentation bundle's
// instrumentation-pino bridges every record emitted here to the OTel logger
// provider configured in ./instrumentation, which exports to Coralogix via OTLP.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export default logger;
