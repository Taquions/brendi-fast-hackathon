'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex -mb-px">
          <Link
            href="/"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </Link>
          <span className="text-gray-300 py-3">|</span>
          <Link
            href="/feedbacks"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/feedbacks'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Feedbacks
          </Link>
          <span className="text-gray-300 py-3">|</span>
          <Link
            href="/orders"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/orders'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pedidos
          </Link>
          <span className="text-gray-300 py-3">|</span>
          <Link
            href="/consumers"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/consumers'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clientes
          </Link>
          <span className="text-gray-300 py-3">|</span>
          <Link
            href="/campaigns"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/campaigns'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campanhas
          </Link>
          <span className="text-gray-300 py-3">|</span>
          <Link
            href="/menu-events"
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
              pathname === '/menu-events'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Menu
          </Link>
        </div>
      </div>
    </nav>
  )
}

