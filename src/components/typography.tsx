import { cn } from '@/lib/utils'
import type React from 'react'

interface TypographyProps
  extends React.HTMLAttributes<HTMLHeadingElement | HTMLParagraphElement> {
  children: React.ReactNode
  className?: string
}

export function H1({ children, className, ...props }: TypographyProps) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-3xl font-extrabold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className, ...props }: TypographyProps) {
  return (
    <h2
      className={cn(
        'scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className, ...props }: TypographyProps) {
  return (
    <h3
      className={cn(
        'scroll-m-20 text-xl font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function H4({ children, className, ...props }: TypographyProps) {
  return (
    <h4
      className={cn(
        'scroll-m-20 text-lg font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

export function H5({ children, className, ...props }: TypographyProps) {
  return (
    <h5
      className={cn(
        'scroll-m-20 text-base font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h5>
  )
}

export function H6({ children, className, ...props }: TypographyProps) {
  return (
    <h6
      className={cn(
        'scroll-m-20 text-sm font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h6>
  )
}

export function Body({ children, className, ...props }: TypographyProps) {
  return (
    <p
      className={cn('leading-7', className)}
      {...props}
    >
      {children}
    </p>
  )
}
