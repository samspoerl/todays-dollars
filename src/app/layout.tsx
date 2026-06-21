import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppContent } from './ui/AppContent'
import { AppFooter } from './ui/AppFooter'
import { AppHeader } from './ui/AppHeader'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Today's Dollars",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="flex h-svh flex-col">
              <AppHeader />
              <AppContent>{children}</AppContent>
              <AppFooter />
            </div>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
