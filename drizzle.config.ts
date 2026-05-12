import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Used by drizzle-kit (`npm run db:generate`, `npm run db:migrate`).
// The runtime app does NOT read this — it constructs its own pool via src/db.
export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/code_agents',
  },
});
