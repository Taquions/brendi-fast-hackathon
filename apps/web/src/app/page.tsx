'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from '@/components/Navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type TimeFilter = '1d' | '7d' | '30d' | 'all' | 'custom'

interface DateRange {
  startDate: string | null
  endDate: string | null
}

interface OrdersTotalResponse {
  success: boolean
  data: {
    total: number
    cached?: boolean
  }
}

interface OrdersRevenueResponse {
  success: boolean
  data: {
    amountInCents: number
    cached?: boolean
  }
}

interface FeedbacksAverageResponse {
  success: boolean
  data: {
    averageRating: number
    totalFeedbacks: number
    cached?: boolean
  }
}

interface MostOrderedProductsResponse {
  success: boolean
  data: {
    products: Array<{
      name: string
      occurrences: number
      totalQuantity: number
    }>
    cached?: boolean
  }
}

interface StoreInfoResponse {
  success: boolean
  data: {
    name: string
    brand: {
      name: string
    }
    address: {
      street: string
      number: string
      neighborhood: string
      city: string
      state: string
      zipcode: string
    }
    owner: {
      name: string
      email: string
      phoneNumber: string
    }
    companyDocument: {
      name: string
      cnpj: string
    }
    logo?: string
    status: {
      title: string
    }
  }
}

export default function HomePage() {
  const [totalOrders, setTotalOrders] = useState<number | null>(null)
  const [totalRevenueInCents, setTotalRevenueInCents] = useState<number | null>(null)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [totalFeedbacks, setTotalFeedbacks] = useState<number | null>(null)
  const [mostOrderedProducts, setMostOrderedProducts] = useState<Array<{
    name: string
    occurrences: number
    totalQuantity: number
  }>>([])
  const [storeInfo, setStoreInfo] = useState<StoreInfoResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const getDateRange = useCallback((filter: TimeFilter, customRange: DateRange): DateRange => {
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    switch (filter) {
      case '1d':
        const oneDayAgo = new Date(endDate)
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        return { startDate: oneDayAgo.toISOString(), endDate: endDate.toISOString() }
      case '7d':
        const sevenDaysAgo = new Date(endDate)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return { startDate: sevenDaysAgo.toISOString(), endDate: endDate.toISOString() }
      case '30d':
        const thirtyDaysAgo = new Date(endDate)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return { startDate: thirtyDaysAgo.toISOString(), endDate: endDate.toISOString() }
      case 'custom':
        return customRange
      case 'all':
      default:
        return { startDate: null, endDate: null }
    }
  }, [])

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Don't fetch if custom filter is selected but dates are not set
        if (timeFilter === 'custom' && (!dateRange.startDate || !dateRange.endDate)) {
          setIsLoading(false)
          return
        }
        
        const range = getDateRange(timeFilter, dateRange)
        const queryParams = new URLSearchParams()
        if (range.startDate) queryParams.append('startDate', range.startDate)
        if (range.endDate) queryParams.append('endDate', range.endDate)
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

        const [ordersRes, revenueRes, feedbacksRes, mostOrderedRes, storeRes] = await Promise.all([
          fetch(`${API_URL}/api/orders/total${queryString}`),
          fetch(`${API_URL}/api/orders/revenue${queryString}`),
          fetch(`${API_URL}/api/feedbacks/average${queryString}`),
          fetch(`${API_URL}/api/orders/most-ordered${queryString}`),
          fetch(`${API_URL}/api/store`),
        ])

        if (!ordersRes.ok) throw new Error('Failed to fetch orders total')
        if (!revenueRes.ok) throw new Error('Failed to fetch revenue total')
        if (!feedbacksRes.ok) throw new Error('Failed to fetch feedbacks average')
        if (!mostOrderedRes.ok) throw new Error('Failed to fetch most ordered products')
        if (!storeRes.ok) throw new Error('Failed to fetch store information')

        const ordersData: OrdersTotalResponse = await ordersRes.json()
        const revenueData: OrdersRevenueResponse = await revenueRes.json()
        const feedbacksData: FeedbacksAverageResponse = await feedbacksRes.json()
        const mostOrderedData: MostOrderedProductsResponse = await mostOrderedRes.json()
        const storeData: StoreInfoResponse = await storeRes.json()

        if (!ordersData.success || !ordersData.data) throw new Error('Invalid orders response')
        if (!revenueData.success || !revenueData.data) throw new Error('Invalid revenue response')
        if (!feedbacksData.success || !feedbacksData.data) throw new Error('Invalid feedbacks response')
        if (!mostOrderedData.success || !mostOrderedData.data) throw new Error('Invalid most ordered products response')
        if (!storeData.success || !storeData.data) throw new Error('Invalid store response')

        setTotalOrders(ordersData.data.total)
        setTotalRevenueInCents(revenueData.data.amountInCents)
        setAverageRating(feedbacksData.data.averageRating)
        setTotalFeedbacks(feedbacksData.data.totalFeedbacks)
        setMostOrderedProducts(mostOrderedData.data.products.slice(0, 3))
        setStoreInfo(storeData.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTotals()
  }, [timeFilter, dateRange, getDateRange])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if ((showCustomDatePicker || showDropdown) && !target.closest('.date-picker-container')) {
        setShowCustomDatePicker(false)
        setShowDropdown(false)
      }
    }

    if (showCustomDatePicker || showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showCustomDatePicker, showDropdown])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatCurrencyFromCents = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(cents / 100)
  }

  const formatRating = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatDateForInput = (date: string | null): string => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter)
    if (filter !== 'custom') {
      setShowCustomDatePicker(false)
      setShowDropdown(false)
    } else {
      setShowCustomDatePicker(true)
    }
  }

  const handleCustomDateApply = () => {
    if (dateRange.startDate && dateRange.endDate) {
      setTimeFilter('custom')
      setShowCustomDatePicker(false)
      setShowDropdown(false)
    }
  }

  const handlePeriodButtonClick = () => {
    setShowDropdown(!showDropdown)
    if (!showDropdown && timeFilter === 'custom') {
      setShowCustomDatePicker(true)
    }
  }

  const getFilterLabel = (): string => {
    switch (timeFilter) {
      case '1d':
        return 'Último dia'
      case '7d':
        return 'Últimos 7 dias'
      case '30d':
        return 'Últimos 30 dias'
      case 'custom':
        if (dateRange.startDate && dateRange.endDate) {
          const start = new Date(dateRange.startDate)
          const end = new Date(dateRange.endDate)
          return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
        }
        return 'Período personalizado'
      case 'all':
      default:
        return 'Escolher período'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-md">
                  <span className="text-white text-xl font-bold">
                    {storeInfo?.brand.name.charAt(0).toUpperCase() || 'B'}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {storeInfo?.brand.name || 'Brendi Analytics'}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {storeInfo?.name || 'Dashboard de gestão'}
                  </p>
                </div>
              </div>
            </div>
            
            {storeInfo && (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-6">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-gray-600 font-medium">
                        {storeInfo.address.street}, {storeInfo.address.number}
                      </p>
                      <p className="text-gray-500">
                        {storeInfo.address.neighborhood}, {storeInfo.address.city} - {storeInfo.address.state}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-gray-600 font-medium">
                        {storeInfo.companyDocument.name}
                      </p>
                      <p className="text-gray-500">
                        CNPJ: {storeInfo.companyDocument.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-end">
                  <div className={`w-2 h-2 rounded-full ${storeInfo.status.title === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="capitalize">{storeInfo.status.title === 'active' ? 'Loja Ativa' : storeInfo.status.title}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Navigation />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Visão Geral
              </h2>
              <p className="text-gray-500 text-sm">
                Principais métricas e indicadores de performance
              </p>
            </div>
            
            <div className="relative date-picker-container">
              <button
                onClick={handlePeriodButtonClick}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 ${
                  timeFilter !== 'all'
                    ? 'bg-blue-50 text-blue-600 border-blue-300'
                    : 'text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{getFilterLabel()}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[280px]">
                  <div className="p-2">
                    <div className="space-y-1 mb-2">
                      <button
                        onClick={() => handleTimeFilterChange('1d')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          timeFilter === '1d'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        1 dia
                      </button>
                      <button
                        onClick={() => handleTimeFilterChange('7d')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          timeFilter === '7d'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        7 dias
                      </button>
                      <button
                        onClick={() => handleTimeFilterChange('30d')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          timeFilter === '30d'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        30 dias
                      </button>
                      <button
                        onClick={() => handleTimeFilterChange('all')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          timeFilter === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Tudo
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2">
                      <button
                        onClick={() => {
                          setShowCustomDatePicker(true)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                          timeFilter === 'custom'
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Período personalizado
                      </button>
                    </div>

                    {showCustomDatePicker && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Selecionar datas</h4>
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Data inicial
                          </label>
                          <input
                            type="date"
                            value={formatDateForInput(dateRange.startDate)}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : null })}
                            max={formatDateForInput(dateRange.endDate) || formatDateForInput(new Date().toISOString())}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Data final
                          </label>
                          <input
                            type="date"
                            value={formatDateForInput(dateRange.endDate)}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null })}
                            min={formatDateForInput(dateRange.startDate)}
                            max={formatDateForInput(new Date().toISOString())}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCustomDateApply}
                            disabled={!dateRange.startDate || !dateRange.endDate}
                            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            Aplicar
                          </button>
                          <button
                            onClick={() => {
                              setShowCustomDatePicker(false)
                              if (timeFilter === 'custom') {
                                setTimeFilter('all')
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {timeFilter !== 'all' && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Período selecionado:</span> {getFilterLabel()}
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full -mr-16 -mt-16 opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                  Total de Pedidos
                </h3>
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="text-blue-100">Carregando...</span>
                </div>
              ) : error ? (
                <div className="text-red-200 text-sm">
                  Erro ao carregar dados
                </div>
              ) : (
                <>
                  <p className="text-5xl font-bold mb-2">
                    {totalOrders !== null ? formatNumber(totalOrders) : '—'}
                  </p>
                  <p className="text-blue-100 text-sm">
                    pedidos registrados
                  </p>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 rounded-full -mr-16 -mt-16 opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-emerald-100 uppercase tracking-wide">
                  Faturamento
                </h3>
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="text-emerald-100">Carregando...</span>
                </div>
              ) : error ? (
                <div className="text-red-200 text-sm">
                  Erro ao carregar dados
                </div>
              ) : (
                <>
                  <p className="text-5xl font-bold mb-2">
                    {totalRevenueInCents !== null ? formatCurrencyFromCents(totalRevenueInCents) : '—'}
                  </p>
                  <p className="text-emerald-100 text-sm">
                    receita acumulada
                  </p>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full -mr-16 -mt-16 opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-amber-100 uppercase tracking-wide">
                  Nota média
                </h3>
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.788 1.401 8.168L12 18.896l-7.335 3.87 1.401-8.168L.132 9.21l8.2-1.192L12 .587z"/>
                  </svg>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="text-amber-100">Carregando...</span>
                </div>
              ) : error ? (
                <div className="text-red-200 text-sm">
                  Erro ao carregar dados
                </div>
              ) : (
                <>
                  <p className="text-5xl font-bold mb-2">
                    {averageRating !== null ? formatRating(averageRating) : '—'}
                  </p>
                  <p className="text-amber-100 text-sm">
                    {totalFeedbacks !== null ? `baseado em ${formatNumber(totalFeedbacks)} feedbacks` : '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400 rounded-full -mr-32 -mt-32 opacity-20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Top 3 Produtos Mais Vendidos
                </h3>
                <p className="text-purple-100 text-sm">
                  Produtos com maior volume de vendas
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2 py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                <span className="text-purple-100">Carregando produtos...</span>
              </div>
            ) : error ? (
              <div className="text-red-200 text-sm text-center py-8">
                Erro ao carregar dados
              </div>
            ) : mostOrderedProducts.length === 0 ? (
              <p className="text-purple-100 text-sm text-center py-8">Nenhum produto encontrado</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {mostOrderedProducts.map((product, index) => (
                  <div key={index} className="bg-white/15 backdrop-blur-sm rounded-xl p-5 border border-white/30 hover:bg-white/20 transition-all transform hover:scale-105">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{index + 1}º</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                          {product.name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-100 text-xs font-medium">Pedidos</span>
                        <span className="text-white font-bold text-sm">{formatNumber(product.occurrences)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-100 text-xs font-medium">Quantidade</span>
                        <span className="text-white font-bold text-sm">{formatNumber(product.totalQuantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

