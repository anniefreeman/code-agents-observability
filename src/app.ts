import express, { type ErrorRequestHandler } from 'express';
import pinoHttp from 'pino-http';
import logger from './telemetry/logger';
import { NotFoundError } from './errors';
import healthRoutes from './features/health/routes';
import sessionsRoutes from './features/sessions/routes';
import * as swagger from './swagger';

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());

app.use('/', healthRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/docs', ...swagger.middleware);

// Domain errors thrown from controllers/services land here. Express 4 forwards
// sync throws automatically; once a service method becomes async we'll need to
// wrap handlers with .catch(next) (or upgrade to Express 5).
const domainErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next(err);
};
app.use(domainErrorHandler);

export default app;
