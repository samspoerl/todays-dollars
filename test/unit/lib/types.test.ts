import { inputsSchema } from '@/lib/types'
import { describe, expect, it } from 'vitest'

/**
 * `inputsSchema` is the only validation between a form submission and a Server
 * Action, so its boundaries are the app's boundaries.
 *
 * Note it computes `currentYear` at module scope from `new Date()`. The specs
 * below derive their expectations the same way rather than hardcoding a year,
 * so they keep passing on 1 January — but that also means this file cannot
 * catch a mistake in how that bound is *derived*, only in how it is applied.
 */
const currentYear = new Date().getFullYear()

describe('inputsSchema', () => {
  const valid = {
    inflationMeasure: 'CPI' as const,
    startAmount: 100,
    startYear: 2000,
  }

  it('accepts a valid set of inputs', () => {
    const result = inputsSchema.parse(valid)

    expect(result).toEqual({
      inflationMeasure: 'CPI',
      startAmount: 100,
      startYear: 2000,
    })
  })

  it('accepts both inflation measures and rejects anything else', () => {
    expect(
      inputsSchema.parse({ ...valid, inflationMeasure: 'CPI' }).inflationMeasure
    ).toBe('CPI')
    expect(
      inputsSchema.parse({ ...valid, inflationMeasure: 'PCE' }).inflationMeasure
    ).toBe('PCE')
    expect(
      inputsSchema.safeParse({ ...valid, inflationMeasure: 'GDP' }).success
    ).toBe(false)
    // Lowercase must fail — the value is used directly as a Prisma enum.
    expect(
      inputsSchema.safeParse({ ...valid, inflationMeasure: 'cpi' }).success
    ).toBe(false)
  })

  describe('startAmount', () => {
    it('coerces a numeric string, because it arrives from a text input', () => {
      expect(
        inputsSchema.parse({ ...valid, startAmount: '250.75' }).startAmount
      ).toBe(250.75)
    })

    it('rejects zero and negatives', () => {
      expect(inputsSchema.safeParse({ ...valid, startAmount: 0 }).success).toBe(
        false
      )
      expect(
        inputsSchema.safeParse({ ...valid, startAmount: -1 }).success
      ).toBe(false)
    })

    it('reports the positivity message', () => {
      const result = inputsSchema.safeParse({ ...valid, startAmount: -1 })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Amount must be positive')
    })

    it('accepts a fractional amount', () => {
      expect(
        inputsSchema.parse({ ...valid, startAmount: 0.01 }).startAmount
      ).toBe(0.01)
    })

    it('rejects a non-numeric string', () => {
      expect(
        inputsSchema.safeParse({ ...valid, startAmount: 'abc' }).success
      ).toBe(false)
    })
  })

  describe('startYear', () => {
    it('accepts 1947, the first year FRED has CPI data for', () => {
      expect(inputsSchema.parse({ ...valid, startYear: 1947 }).startYear).toBe(
        1947
      )
    })

    it('rejects 1946', () => {
      const result = inputsSchema.safeParse({ ...valid, startYear: 1946 })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Year must be 1947 or later')
    })

    it('accepts the current year', () => {
      expect(
        inputsSchema.parse({ ...valid, startYear: currentYear }).startYear
      ).toBe(currentYear)
    })

    it('rejects a future year', () => {
      const result = inputsSchema.safeParse({
        ...valid,
        startYear: currentYear + 1,
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe(
        `Year must be ${currentYear} or earlier`
      )
    })

    it('coerces a numeric string', () => {
      expect(
        inputsSchema.parse({ ...valid, startYear: '1985' }).startYear
      ).toBe(1985)
    })

    it('rejects a non-integer year', () => {
      expect(
        inputsSchema.safeParse({ ...valid, startYear: 1985.5 }).success
      ).toBe(false)
    })
  })
})
