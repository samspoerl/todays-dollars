import {
  type InflationMeasure as InflationMeasureEnum,
  type Metadata,
  type Observation,
} from '@/generated/prisma/client'
import { z } from 'zod'

// SERVER RESPONSE

export type ServerResponse<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      message: string
    }

// AUDIT FIELDS

type AuditFields = 'createdAt' | 'updatedAt'

// OBSERVATIONS

export type ObservationDto = Omit<Observation, AuditFields | 'fredDate'>

export type ObservationCreateDto = Omit<Observation, AuditFields | 'id'>

// INFLATION MEASURE

export type InflationMeasure = InflationMeasureEnum

// METADATA

export type MetadataDto = Metadata

// FORM INPUTS

// The first full year FRED has data for in each series (CPIAUCSL, PCEPI).
export const MIN_START_YEAR: Record<InflationMeasure, number> = {
  CPI: 1947,
  PCE: 1959,
}

export const MAX_START_YEAR = new Date().getFullYear()

export const inputsSchema = z
  .object({
    inflationMeasure: z.enum(['CPI', 'PCE']),
    startAmount: z.coerce.number().positive('Amount must be positive'),
    startYear: z.coerce
      .number()
      .int()
      .max(MAX_START_YEAR, `Year must be ${MAX_START_YEAR} or earlier`),
  })
  .superRefine(({ inflationMeasure, startYear }, ctx) => {
    const minYear = MIN_START_YEAR[inflationMeasure]
    if (startYear < minYear) {
      ctx.addIssue({
        code: 'custom',
        path: ['startYear'],
        message: `Year must be ${minYear} or later for ${inflationMeasure}`,
      })
    }
  })

export type CalculationInputs = z.infer<typeof inputsSchema>

// CALCULATION RESULT

export interface CalculationResult {
  startingAmount: number
  year: number
  observations: ObservationDto[]
}
