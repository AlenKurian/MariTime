import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MaritimeDocs — AI-Powered Maritime Documentation',
  description: 'Upload, extract, and match maritime shipping documents with port requirements using OCR and AI',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50">
        {children}
      </body>
    </html>
  )
}
