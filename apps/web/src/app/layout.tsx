import type { Metadata } from 'next'
import './globals.css'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'

export const metadata: Metadata = {
  title: 'Brendi Analytics',
  description: 'Dashboard de analytics para gestão de restaurantes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50">
        {children}
        <FloatingChatWrapper />
      </body>
    </html>
  )
}

