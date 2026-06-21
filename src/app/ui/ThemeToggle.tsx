'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { setTheme } = useTheme()

  // next-themes injects a script that adds the `.dark` class to the `<html>` element
  // before the page loads, so CSS `dark:` variants take effect immediately. Without this,
  // we'd need to track mount state to avoid rendering the wrong icon before hydration.
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full dark:hidden"
            onClick={() => setTheme('dark')}
          >
            <SunIcon />
            <span className="sr-only">Toggle dark mode</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle dark mode</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-full dark:inline-flex"
            onClick={() => setTheme('light')}
          >
            <MoonIcon />
            <span className="sr-only">Toggle light mode</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle light mode</TooltipContent>
      </Tooltip>
    </>
  )
}
