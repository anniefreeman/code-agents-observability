import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as sessionsSchema from './schema/sessions';
import * as bookingsSchema from './schema/bookings';

// Single shared pool for the process. Pool size is intentionally small to fit
// within RDS instance-class connection limits — tune via DATABASE_POOL_MAX
// if needed. Set DATABASE_URL to enable Postgres (otherwise the singletons
// in feature service.ts files fall back to in-memory adapters).
//
// In EKS+RDS, DATABASE_URL will include sslmode=require; node-postgres reads
// the query string and configures TLS automatically. For local docker-compose
// Postgres we leave SSL off.
export const createPool = (databaseUrl: string): Pool =>
  new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

export const createDb = (pool: Pool) =>
  drizzle(pool, { schema: { ...sessionsSchema, ...bookingsSchema } });

export type Db = ReturnType<typeof createDb>;

// Runtime singleton. Built lazily on first access so unit tests (which don't
// set DATABASE_URL) never construct a pool. Returns null when DATABASE_URL is
// unset, signalling the feature singletons to use their in-memory adapters.
let _db: Db | null | undefined;
export const getDb = (): Db | null => {
  if (_db !== undefined) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    _db = null;
    return null;
  }
  _db = createDb(createPool(url));
  return _db;
};
