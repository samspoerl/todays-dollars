'use server'

import { redis } from '@/lib/redis'
import { type InflationMeasure } from '@/lib/types'
import { format } from 'date-fns'

const DAILY_METRICS_KEY = 'metrics:daily'
const DURATION_KEY = 'duration'
const COUNT_KEY = 'count'
const RETENTION = 90 * 24 * 60 * 60 // 90 days in seconds

export default async function logMetrics(
  duration: number,
  inflationMeasure: InflationMeasure
) {
  try {
    const dateKey = format(new Date(), 'yyyyMMdd')
    await redis
      .pipeline()
      .hincrby(
        `${DAILY_METRICS_KEY}:${dateKey}:${COUNT_KEY}`,
        inflationMeasure,
        1
      )
      .expire(`${DAILY_METRICS_KEY}:${dateKey}:${COUNT_KEY}`, RETENTION, 'NX')
      .rpush(`${DAILY_METRICS_KEY}:${dateKey}:${DURATION_KEY}`, duration)
      .expire(
        `${DAILY_METRICS_KEY}:${dateKey}:${DURATION_KEY}`,
        RETENTION,
        'NX'
      )
      .exec()
  } catch (error) {
    console.error('Error tracking metrics')
  }
}
