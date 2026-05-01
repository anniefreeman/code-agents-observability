// Tracing must be the first import — it patches modules at import time, so
// any module imported before it (including ./app) won't be auto-instrumented.
import '../tracing';
import app from './app';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
