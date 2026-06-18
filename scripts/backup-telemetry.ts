import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  const records = await prisma.usageMetric.findMany({
    orderBy: { timestamp: 'asc' },
  })

  const backupsDir = join(process.cwd(), 'backups')
  await mkdir(backupsDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `usage_metrics_${timestamp}.json`
  const outPath = join(backupsDir, filename)

  await writeFile(outPath, JSON.stringify(records, null, 2), 'utf-8')

  console.log(`✔️ Backed up ${records.length} records → backups/${filename}`)
}

main()
  .catch((err) => {
    console.error('Backup failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
