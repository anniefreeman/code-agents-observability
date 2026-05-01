const express = require('express');
const healthRoutes = require('./features/health/routes');
const sessionsRoutes = require('./features/sessions/routes');
const swagger = require('./swagger');

const app = express();

app.use(express.json());

app.use('/', healthRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/docs', ...swagger.middleware);

module.exports = app;
