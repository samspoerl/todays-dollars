import {
  type InflationMeasure as InflationMeasureEnum,
  type Metadata,
  type Observation,
} from '@prisma/client'
import { z } from 'zod'

// THEME

export type Theme = 'light' | 'dark'

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

const currentYear = new Date().getFullYear()

export const inputsSchema = z.object({
  inflationMeasure: z.enum(['CPI', 'PCE']),
  startAmount: z.coerce.number().positive('Amount must be positive'),
  startYear: z.coerce
    .number()
    .int()
    .min(1947, 'Year must be 1947 or later')
    .max(currentYear, `Year must be ${currentYear} or earlier`),
})

export type CalculationInputs = z.infer<typeof inputsSchema>

// CALCULATION RESULT

export interface CalculationResult {
  startingAmount: number
  year: number
  observations: ObservationDto[]
}
