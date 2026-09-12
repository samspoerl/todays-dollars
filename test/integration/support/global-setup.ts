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
  // `prisma.config.ts` does `import 'dotenv/config'`, and this repository's
  // `.env` holds the development Neon URLs. dotenv does not overwrite a
  // variable that is already set, so the values assigned in the vitest config
  // win — but that is the single fact keeping `migrate deploy` off a remote
  // database, so `assertLocalDatabase` runs immediately above and
  // `support/db.ts` re-checks the live connection before the first TRUNCATE.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  })
}
