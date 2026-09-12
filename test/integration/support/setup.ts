import { afterAll, beforeEach } from 'vitest'
import { prisma, resetDb } from './db'

// Start every test from an empty database. Combined with serial execution
// (`fileParallelism: false`) this keeps each case fully isolated.
beforeEach(async () => {
  await resetDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})
