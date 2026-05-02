import express, { type ErrorRequestHandler } from 'express';
import pinoHttp from 'pino-http';
import logger from './telemetry/logger';
import { DomainError } from './errors';
import healthRoutes from './features/health/routes';
import sessionsRoutes from './features/sessions/routes';
import bookingsRoutes from './features/bookings/routes';
import * as swagger from './swagger';

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());

app.use('/', healthRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/docs', ...swagger.middleware);

// Domain errors thrown from controllers/services land here. Sync throws from
// Express 4 forward automatically; async controllers go through asyncHandler
// (src/asyncHandler.ts) which forwards Promise rejections to next.
//
// One branch handles every DomainError subclass via the statusCode field,
// so adding a new error class doesn't require touching this middleware.
const domainErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  next(err);
};
app.use(domainErrorHandler);

export default app;
