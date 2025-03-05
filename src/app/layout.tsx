import { ThemeProvider } from '@/contexts/ThemeContext'
import { type Theme } from '@/lib/types'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Inflation Adjusted',
  description:
    "An app to answer the question: 'How much is that in today's dollars?'",
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
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
