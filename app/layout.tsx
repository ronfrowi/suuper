import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suuper — Comparador de precios en Costa Rica',
  description: 'Compara precios de supermercados en Costa Rica en tiempo real.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  )
}
