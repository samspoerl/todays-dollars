// Main content layout for all app pages.

import type React from 'react'

export function AppContent({ children }: { children: React.ReactNode }) {
  return <main className="flex grow p-6 sm:p-8">{children}</main>
}
