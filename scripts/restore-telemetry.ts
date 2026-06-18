import 'dotenv/config'
import { readFileSync } from 'fs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type InflationMeasure } from '../src/generated/prisma/client'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: tsx scripts/restore-telemetry.ts <path-to-backup.json>')
  process.exit(1)
}

const url = process.env.DATABASE_URL!
const adapter =
  process.env.DATABASE_ADAPTER === 'pg'
    ? new PrismaPg({ connectionString: url })
    : new PrismaNeon({ connectionString: url })

const prisma = new PrismaClient({ adapter })

interface BackupRecord {
  id: string
  timestamp: string
  inflationMeasure: InflationMeasure
  duration: number
}

async function main() {
  const raw = readFileSync(filePath, 'utf-8')
  const records: BackupRecord[] = JSON.parse(raw)

  const result = await prisma.telemetry.createMany({
    data: records.map(({ id: _, ...rest }) => ({
      ...rest,
      timestamp: new Date(rest.timestamp),
    })),
  })

  console.log(`✔ Restored ${result.count} records`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
