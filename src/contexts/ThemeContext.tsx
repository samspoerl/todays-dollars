'use client'

import { Theme } from '@/lib/types'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({
  initialTheme,
  children,
}: {
  initialTheme: Theme
  children: ReactNode
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  function setCookie(newTheme: Theme) {
    document.cookie = `theme=${newTheme}; path=/; max-age=${60 * 60 * 24 * 400}` // 400 days, though some browsers limit this
  }

  function updateTheme(newTheme: Theme) {
    setCookie(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    setTheme(newTheme)
  }

  // Handle changes to prefers-color-scheme
  useEffect(() => {
    function handleMediaQueryChange() {
      const newTheme = mediaQuery.matches ? 'dark' : 'light'
      updateTheme(newTheme)
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleMediaQueryChange)

    // Clean up event listener
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [])

  // Handle no preference by setting to system default
  useEffect(() => {
    // Check for cookie
    const match = document.cookie.match(/(?:^|;\s*)theme=(dark|light)/)
    if (!match) {
      // Set cookie to system default for next time.
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const systemTheme = mediaQuery.matches ? 'dark' : 'light'
      updateTheme(systemTheme)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    updateTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
