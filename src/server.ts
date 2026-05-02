// Telemetry must be the first import — auto-instrumentations patch modules at
// import time, so anything imported before it (including ./app) won't be
// instrumented.
import './telemetry/instrumentation';
import app from './app';
import logger from './telemetry/logger';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server listening');
});
