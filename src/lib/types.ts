import { z } from 'zod'

export type Theme = 'light' | 'dark'

export type ServerResponse<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      message: string
    }

export interface Observation {
  date: string
  value: number
}

const currentYear = new Date().getFullYear()

export const inputsSchema = z.object({
  inflationMeasure: z.enum(['cpi', 'pce']),
  startAmount: z.coerce.number().positive('Amount must be positive'),
  startYear: z.coerce
    .number()
    .int()
    .min(1947, 'Year must be 1947 or later')
    .max(currentYear, `Year must be ${currentYear} or earlier`),
})

export type InflationMeasure = 'cpi' | 'pce'

export type Inputs = z.infer<typeof inputsSchema>

export interface Outputs {
  startingAmount: number
  year: number
  observations: Observation[]
}
