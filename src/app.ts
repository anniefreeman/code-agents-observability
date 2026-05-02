import express from 'express';
import pinoHttp from 'pino-http';
import logger from './telemetry/logger';
import healthRoutes from './features/health/routes';
import sessionsRoutes from './features/sessions/routes';
import * as swagger from './swagger';

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());

app.use('/', healthRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/docs', ...swagger.middleware);

export default app;
