import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Roblox Bot Decliner',
  description: 'Automatically decline botted friend requests on Roblox',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
