import { cn } from '@/lib/utils'
import * as React from 'react'

export default function PageWrapper({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto flex max-w-3xl grow flex-col gap-6', className)}
      {...props}
    />
  )
}
