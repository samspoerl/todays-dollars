import { execSync } from 'node:child_process'
import { assertLocalDatabase } from './guard'

/**
 * Runs once, in the main process, before any test file.
 * `vitest.integration.config.mts` has already put the local Docker credentials
 * on `process.env` by the time this executes.
 */
export default function setup() {
  assertLocalDatabase()

  // Ensure the schema exists on a possibly-fresh Docker volume before any test
  // connects. `migrate deploy` is idempotent — a no-op when already up to date.
  //
  // `prisma.config.ts` does `import 'dotenv/config'`, and `.env` may hold any
  // connection string. dotenv leaves already-set variables alone, so the
  // config's values win — which is why `assertLocalDatabase` runs immediately
  // above, before anything can migrate.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  })
}
