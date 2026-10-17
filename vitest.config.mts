import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests only. Everything under test here is a pure function or a Zod
// schema — no DOM, no database, no Next.js request context — so `node` is both
// the fastest environment and the honest one.
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
