import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/flight/providers'
import { getCompanySettings } from '@/lib/get-company-settings'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await getCompanySettings()

  return {
    title: {
      default: companyName,
      template: `%s · ${companyName}`,
    },
    description: `The ${companyName} member portal: flight authorisations and the club Safety Hub.`,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  }
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fcfcfd',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { timeZone } = await getCompanySettings()

  return (
    <html
      lang="en-NZ"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers timeZone={timeZone}>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
