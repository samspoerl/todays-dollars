import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests only. Everything under test here is a pure function or a Zod
// schema — no DOM, no database, no Next.js request context — so `node` is both
// the fastest environment and the honest one.
//
// The surface is deliberately small. The most valuable pure logic in this app
// (the monthly compounding in `src/lib/actions/calculate.ts`, the FRED→DTO
// transform and the staleness math in `src/lib/inflation-data.ts`) is currently
// inline inside a Server Action and a Prisma-writing function, so none of it is
// reachable from here. Splitting those out is a separate piece of work; until
// then this suite covers `utils.ts` and the input schema, and the integration
// suite covers the rest through a real database.
export default defineConfig({
  resolve: {
    alias: {
      // tsconfig.json declares one path per top-level directory
      // (`@/lib/*`, `@/components/*`, …); this single `@` → `src` alias is a
      // deliberate superset of those. Anything it would resolve that tsconfig
      // would not is caught by `tsc` in the same `npm run ci`.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Deliberately narrow: the integration suite needs a database and a FRED
    // key, and must not be picked up by a plain `npm test`.
    include: ['test/unit/**/*.test.ts'],
  },
})
