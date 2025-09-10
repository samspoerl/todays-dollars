'use server'

import prisma from '@/lib/prisma'
import { type InflationMeasure } from '@/lib/types'
import { format } from 'date-fns'

export default async function logMetrics(
  duration: number,
  inflationMeasure: InflationMeasure
) {
  try {
    const dateKey = format(new Date(), 'yyyyMMdd')

    await prisma.usageMetric.create({
      data: {
        date: dateKey,
        inflationMeasure,
        duration,
      },
    })
  } catch (error) {
    console.error('Error logging metrics')
  }
}
