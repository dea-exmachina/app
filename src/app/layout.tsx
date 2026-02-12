import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { LayoutProvider } from '@/contexts/LayoutContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AccentInitializer } from '@/components/providers/AccentInitializer'
import { TextSizeInitializer } from '@/components/providers/TextSizeInitializer'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'dea::control',
  description: 'Control center for dea-exmachina',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AccentInitializer />
          <TextSizeInitializer />
          <LayoutProvider>
            <div className="flex h-screen">
              {/* Desktop Sidebar */}
              <div className="hidden lg:flex">
                <Sidebar />
              </div>

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto">
                {/* Mobile Header */}
                <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
                  <MobileSidebar />
                  <span className="ml-4 font-mono text-sm font-semibold tracking-wide text-accent-foreground">
                    dea<span className="text-muted-foreground">::</span>control
                  </span>
                </div>

                {/* Page Content */}
                <div className="p-6">{children}</div>
              </main>
            </div>
          </LayoutProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
