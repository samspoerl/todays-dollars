'use server'

import prisma from '@/lib/prisma'
import { type InflationMeasure } from '@/lib/types'

export default async function logMetrics({
  timestamp,
  duration,
  inflationMeasure,
}: {
  timestamp: Date
  duration: number
  inflationMeasure: InflationMeasure
}) {
  try {
    await prisma.usageMetric.create({
      data: {
        timestamp,
        inflationMeasure,
        duration,
      },
    })
  } catch (error) {
    console.error('Error logging metrics')
  }
}
