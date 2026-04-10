import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chathurya — Student Developers Club',
  description: 'CSDC Synapse — NFC-powered digital identity and engagement platform for Chathurya SDC, Seshadripuram College.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}