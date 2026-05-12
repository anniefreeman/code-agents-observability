import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// One-shot migration runner. Invoked via `npm run db:migrate` for local dev,
// and as a Kubernetes Job (or init container) before the app rolls in EKS.
//
// Reads DATABASE_URL from the environment — same single source of truth the
// app uses at runtime. Exits non-zero on failure so a CI/CD step or a Job's
// backoff policy can react correctly.
const main = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required to run migrations');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Migrations complete.');

  await pool.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
