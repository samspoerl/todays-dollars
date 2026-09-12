import { cn, formatUSD } from '@/lib/utils'
import { describe, expect, it } from 'vitest'

describe('formatUSD', () => {
  it('formats a number as USD with no decimals by default', () => {
    expect(formatUSD(1234.5)).toBe('$1,235')
    expect(formatUSD(0)).toBe('$0')
  })

  it('honours an explicit decimal count', () => {
    expect(formatUSD(1234.5, 2)).toBe('$1,234.50')
    expect(formatUSD(1234.567, 2)).toBe('$1,234.57')
  })

  it('formats negatives with a leading minus, not parentheses', () => {
    expect(formatUSD(-42)).toBe('-$42')
    expect(formatUSD(-42, 2)).toBe('-$42.00')
  })

  it('groups thousands', () => {
    // The app routinely renders values this large — an amount from 1947
    // compounded to today.
    expect(formatUSD(1234567)).toBe('$1,234,567')
  })

  it('parses a numeric string', () => {
    expect(formatUSD('1234.5', 2)).toBe('$1,234.50')
  })

  it('returns $0 for a string that does not parse', () => {
    // Documents the current contract rather than endorsing it: the fallback is
    // indistinguishable from a real zero.
    expect(formatUSD('abc')).toBe('$0')
    expect(formatUSD('')).toBe('$0')
  })

  it('parses the leading number out of a partly-numeric string', () => {
    // `parseFloat`, not `Number`, so this is lenient. Pinned because the
    // difference decides whether '12abc' is $12 or $0.
    expect(formatUSD('12abc')).toBe('$12')
  })

  it('formats a numeric zero rather than treating it as empty', () => {
    // `0` is falsy, so this guards against a `!value` early return creeping in.
    expect(formatUSD(0, 2)).toBe('$0.00')
  })

  it('returns $0 for NaN', () => {
    expect(formatUSD(NaN)).toBe('$0')
  })

  it('rounds half away from zero at the cent', () => {
    expect(formatUSD(1.005, 2)).toBe('$1.01')
    expect(formatUSD(1.004, 2)).toBe('$1.00')
  })
})

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('lets a later tailwind class win over an earlier conflicting one', () => {
    // The whole reason this wraps twMerge rather than clsx alone.
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('keeps non-conflicting tailwind classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })
})
