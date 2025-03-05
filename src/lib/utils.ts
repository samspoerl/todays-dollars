import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as USD currency with the $ symbol
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places to show (default: 0)
 * @returns Formatted USD currency string
 */
export function formatUSD(value: number | string, decimalPlaces = 0): string {
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  // Handle invalid input
  if (isNaN(numValue)) {
    return '$0'
  }

  // Format using Intl.NumberFormat
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numValue)
}
