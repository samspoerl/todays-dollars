import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { type Theme } from '@/lib/types'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { AppContent } from './ui/AppContent'
import { AppHeader } from './ui/AppHeader'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Inflation Adjusted',
  description:
    "An app to answer the question: 'How much is that in today's dollars?'",
  keywords: [
    'inflation calculator',
    'inflation adjusted',
    'inflation adjuster',
    'adjust for inflation',
    "today's dollars",
    "today's money",
    "how much is X worth in today's money?",
    'purchasing power',
    'cost of living adjustment',
    'best inflation calculator',
  ],
}

async function getInitialTheme(): Promise<Theme> {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  return theme === 'dark' ? 'dark' : 'light'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const theme = await getInitialTheme()

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider initialTheme={theme}>
          <TooltipProvider>
            <AppHeader />
            <AppContent>{children}</AppContent>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
