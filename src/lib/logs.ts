'use server'

import prisma from '@/lib/prisma'
import { type InflationMeasure } from '@/lib/types'

export default async function logTelemetry({
  timestamp,
  duration,
  inflationMeasure,
}: {
  timestamp: Date
  duration: number
  inflationMeasure: InflationMeasure
}) {
  try {
    await prisma.telemetry.create({
      data: {
        timestamp,
        inflationMeasure,
        duration,
      },
    })
  } catch (error) {
    console.error('Error logging telemetry')
  }
}
