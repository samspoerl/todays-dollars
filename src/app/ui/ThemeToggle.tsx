'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTheme } from '@/contexts/ThemeContext'
import { MoonIcon, SunIcon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <MoonIcon className="size-5 sm:size-4" />
          ) : (
            <SunIcon className="size-5 sm:size-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  )
}
