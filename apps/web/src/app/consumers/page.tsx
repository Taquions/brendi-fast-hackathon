'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import Navigation from '@/components/Navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ConsumerPreferencesResponse {
  success: boolean
  data: {
    campaign_optout: {
      enabled: number
      disabled: number
      total: number
    }
    best_campaign_hour: {
      [hour: number]: number
    }
    best_campaign_weekday: {
      [weekday: string]: number
    }
    last_order_hour: {
      [hour: number]: number
    }
    last_order_weekday: {
      [weekday: string]: number
    }
  }
}

interface ConsumersResponse {
  success: boolean
  data: {
    total: number
    topConsumers: Array<{
      name: string
      phone: string
      numberOfOrders: number
    }>
  }
}

interface NewConsumersResponse {
  success: boolean
  data: Array<{
    name: string
    phone: string
    numberOfOrders: number
    createdAt: string
  }>
}

interface StoreInfoResponse {
  success: boolean
  data: {
    workingHours?: {
      mon?: Array<{ start: number; end: number }>
      tue?: Array<{ start: number; end: number }>
      wed?: Array<{ start: number; end: number }>
      thu?: Array<{ start: number; end: number }>
      fri?: Array<{ start: number; end: number }>
      sat?: Array<{ start: number; end: number }>
      sun?: Array<{ start: number; end: number }>
    }
  }
}

const WEEKDAY_NAMES: { [key: string]: string } = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function ConsumersPage() {
  const [stats, setStats] = useState<ConsumerPreferencesResponse['data'] | null>(null)
  const [consumersStats, setConsumersStats] = useState<ConsumersResponse['data'] | null>(null)
  const [newConsumers, setNewConsumers] = useState<NewConsumersResponse['data'] | null>(null)
  const [newConsumersWithZeroOrders, setNewConsumersWithZeroOrders] = useState<NewConsumersResponse['data'] | null>(null)
  const [storeInfo, setStoreInfo] = useState<StoreInfoResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topConsumersLimit, setTopConsumersLimit] = useState(10)
  const [newConsumersPage, setNewConsumersPage] = useState(1)
  const [newConsumersZeroOrdersPage, setNewConsumersZeroOrdersPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchStats()
    fetchConsumersStats()
    fetchNewConsumers()
    fetchNewConsumersWithZeroOrders()
    fetchStoreInfo()
  }, [topConsumersLimit])

  const fetchStats = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const response = await fetch(`${API_URL}/api/consumer-preferences/stats`)

      if (!response.ok) {
        throw new Error('Failed to fetch consumer preferences stats')
      }

      const data: ConsumerPreferencesResponse = await response.json()

      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchConsumersStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/consumers/stats?limit=${topConsumersLimit}`)
      if (!response.ok) {
        return
      }
      const data: ConsumersResponse = await response.json()
      if (data.success) {
        setConsumersStats(data.data)
      }
    } catch (err) {
      // Silently fail
    }
  }

  const fetchNewConsumers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/consumers/new`)
      if (!response.ok) {
        return
      }
      const data: NewConsumersResponse = await response.json()
      if (data.success) {
        setNewConsumers(data.data)
      }
    } catch (err) {
      // Silently fail
    }
  }

  const fetchNewConsumersWithZeroOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/consumers/new-zero-orders`)
      if (!response.ok) {
        return
      }
      const data: NewConsumersResponse = await response.json()
      if (data.success) {
        setNewConsumersWithZeroOrders(data.data)
      }
    } catch (err) {
      // Silently fail
    }
  }

  const fetchStoreInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/store`)
      if (!response.ok) {
        return
      }
      const data: StoreInfoResponse = await response.json()
      if (data.success) {
        setStoreInfo(data.data)
      }
    } catch (err) {
      // Silently fail, working hours are optional
    }
  }

  const handleRefresh = () => {
    fetchStats(true)
    fetchConsumersStats()
    fetchNewConsumers()
    fetchNewConsumersWithZeroOrders()
    fetchStoreInfo()
  }

  const getWorkingHoursRange = () => {
    if (!storeInfo?.workingHours) {
      return { minHour: 0, maxHour: 23 }
    }

    let minMinutes = Infinity
    let maxMinutes = -Infinity

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    for (const day of days) {
      const hours = storeInfo.workingHours[day as keyof typeof storeInfo.workingHours]
      if (hours && Array.isArray(hours) && hours.length > 0) {
        for (const period of hours) {
          if (period.start < minMinutes) minMinutes = period.start
          if (period.end > maxMinutes) maxMinutes = period.end
        }
      }
    }

    if (minMinutes === Infinity || maxMinutes === -Infinity) {
      return { minHour: 0, maxHour: 23 }
    }

    const minHour = Math.floor(minMinutes / 60)
    const maxHour = Math.floor(maxMinutes / 60)

    return { minHour, maxHour }
  }

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatWeekday = (weekday: string) => {
    return WEEKDAY_NAMES[weekday.toLowerCase()] || weekday
  }

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
    }
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const prepareHourData = (hourDistribution: { [hour: number]: number }) => {
    const { minHour, maxHour } = getWorkingHoursRange()
    const data = []
    for (let hour = minHour; hour <= maxHour; hour++) {
      data.push({
        hour: formatHour(hour),
        value: hourDistribution[hour] || 0,
      })
    }
    return data
  }

  const prepareWeekdayData = (weekdayDistribution: { [weekday: string]: number }) => {
    return WEEKDAY_ORDER.map((weekday) => ({
      id: formatWeekday(weekday),
      label: formatWeekday(weekday),
      value: weekdayDistribution[weekday] || 0,
    })).filter((item) => item.value > 0)
  }

  const getPaginatedData = <T,>(data: T[], page: number, itemsPerPage: number) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (totalItems: number, itemsPerPage: number) => {
    return Math.ceil(totalItems / itemsPerPage)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Clientes
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Análise de clientes, preferências e comportamento de compra
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Atualizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar Dados
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando estatísticas de clientes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Erro ao carregar dados: {error}</p>
            <button
              onClick={() => fetchStats()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                    Total de Clientes
                  </h3>
                  <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">
                  {consumersStats?.total.toLocaleString('pt-BR') || '—'}
                </p>
                <p className="text-blue-100 text-sm mt-2">
                  clientes com pedidos
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-purple-100 uppercase tracking-wide">
                    Total de Clientes Cadastrados
                  </h3>
                  <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">
                  {stats?.campaign_optout.total.toLocaleString('pt-BR') || '—'}
                </p>
                <p className="text-purple-100 text-sm mt-2">
                  clientes cadastrados
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-green-100 uppercase tracking-wide">
                    Clientes com disparos ativos
                  </h3>
                  <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">
                  {stats?.campaign_optout.enabled.toLocaleString('pt-BR') || '—'}
                </p>
                <p className="text-green-100 text-sm mt-2">
                  {stats ? `${((stats.campaign_optout.enabled / stats.campaign_optout.total) * 100).toFixed(1)}% do total` : '—'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-red-100 uppercase tracking-wide">
                    Clientes com disparos desativados
                  </h3>
                  <svg className="w-8 h-8 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">
                  {stats?.campaign_optout.disabled.toLocaleString('pt-BR') || '—'}
                </p>
                <p className="text-red-100 text-sm mt-2">
                  {stats ? `${((stats.campaign_optout.disabled / stats.campaign_optout.total) * 100).toFixed(1)}% do total` : '—'}
                </p>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Melhor Dia da Semana para Campanha
                  </h2>
                  <div className="h-80">
                    <ResponsivePie
                      data={prepareWeekdayData(stats.best_campaign_weekday)}
                      margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4']}
                      borderWidth={2}
                      borderColor="#ffffff"
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#333333"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor="#ffffff"
                      legends={[
                        {
                          anchor: 'bottom',
                          direction: 'row',
                          justify: false,
                          translateX: 0,
                          translateY: 50,
                          itemsSpacing: 8,
                          itemWidth: 80,
                          itemHeight: 18,
                          itemTextColor: '#333',
                          itemDirection: 'left-to-right',
                          itemOpacity: 1,
                          symbolSize: 14,
                          symbolShape: 'circle',
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Dia da Semana do Último Pedido
                  </h2>
                  <div className="h-80">
                    <ResponsivePie
                      data={prepareWeekdayData(stats.last_order_weekday)}
                      margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      colors={['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']}
                      borderWidth={2}
                      borderColor="#ffffff"
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#333333"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor="#ffffff"
                      legends={[
                        {
                          anchor: 'bottom',
                          direction: 'row',
                          justify: false,
                          translateX: 0,
                          translateY: 50,
                          itemsSpacing: 8,
                          itemWidth: 80,
                          itemHeight: 18,
                          itemTextColor: '#333',
                          itemDirection: 'left-to-right',
                          itemOpacity: 1,
                          symbolSize: 14,
                          symbolShape: 'circle',
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {consumersStats && consumersStats.topConsumers.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Top {topConsumersLimit} Clientes com Mais Pedidos
                  </h2>
                  {topConsumersLimit === 10 && (
                    <button
                      onClick={() => setTopConsumersLimit(3)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Reduzir para Top 3
                    </button>
                  )}
                  {topConsumersLimit === 3 && (
                    <button
                      onClick={() => setTopConsumersLimit(10)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Expandir para Top 10
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total de Pedidos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consumersStats.topConsumers.map((consumer, index) => (
                        <tr key={consumer.phone} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                index === 1 ? 'bg-gray-100 text-gray-800' :
                                index === 2 ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {index + 1}º
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {consumer.name || 'Sem nome'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatPhone(consumer.phone)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {consumer.numberOfOrders.toLocaleString('pt-BR')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats && (
              <>
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Melhor Horário para Campanha
                  </h2>
                  <div className="h-96">
                    <ResponsiveBar
                      data={prepareHourData(stats.best_campaign_hour)}
                      keys={['value']}
                      indexBy="hour"
                      margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                      padding={0.3}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      colors="#2563eb"
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: 'Horário',
                        legendPosition: 'middle',
                        legendOffset: 60,
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Quantidade de Clientes',
                        legendPosition: 'middle',
                        legendOffset: -50,
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor="#ffffff"
                      animate={true}
                      motionConfig="gentle"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Horário do Último Pedido
                  </h2>
                  <div className="h-96">
                    <ResponsiveBar
                      data={prepareHourData(stats.last_order_hour)}
                      keys={['value']}
                      indexBy="hour"
                      margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                      padding={0.3}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      colors="#f97316"
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: 'Horário',
                        legendPosition: 'middle',
                        legendOffset: 60,
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Quantidade de Clientes',
                        legendPosition: 'middle',
                        legendOffset: -50,
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor="#ffffff"
                      animate={true}
                      motionConfig="gentle"
                    />
                  </div>
                </div>
              </>
            )}

            {newConsumers && newConsumers.length > 0 && (() => {
              const paginatedNewConsumers = getPaginatedData(newConsumers, newConsumersPage, itemsPerPage)
              const totalPages = getTotalPages(newConsumers.length, itemsPerPage)
              
              return (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Clientes Novos (Últimos 30 dias)
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Clientes criados nos últimos 30 dias com mais de 1 pedido
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Telefone
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total de Pedidos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Criado em
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedNewConsumers.map((consumer) => (
                          <tr key={consumer.phone} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {consumer.name || 'Sem nome'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatPhone(consumer.phone)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {consumer.numberOfOrders.toLocaleString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(consumer.createdAt)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Mostrando {((newConsumersPage - 1) * itemsPerPage) + 1} a {Math.min(newConsumersPage * itemsPerPage, newConsumers.length)} de {newConsumers.length} clientes
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNewConsumersPage(prev => Math.max(1, prev - 1))}
                          disabled={newConsumersPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-700">
                          Página {newConsumersPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setNewConsumersPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={newConsumersPage === totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {newConsumersWithZeroOrders && newConsumersWithZeroOrders.length > 0 && (() => {
              const paginatedNewConsumersZeroOrders = getPaginatedData(newConsumersWithZeroOrders, newConsumersZeroOrdersPage, itemsPerPage)
              const totalPages = getTotalPages(newConsumersWithZeroOrders.length, itemsPerPage)
              
              return (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Clientes que Entraram em Contato (Últimos 30 dias)
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Clientes criados nos últimos 30 dias que ainda não realizaram pedidos
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Telefone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Criado em
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedNewConsumersZeroOrders.map((consumer) => (
                          <tr key={consumer.phone} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {consumer.name || 'Sem nome'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatPhone(consumer.phone)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(consumer.createdAt)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Mostrando {((newConsumersZeroOrdersPage - 1) * itemsPerPage) + 1} a {Math.min(newConsumersZeroOrdersPage * itemsPerPage, newConsumersWithZeroOrders.length)} de {newConsumersWithZeroOrders.length} clientes
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNewConsumersZeroOrdersPage(prev => Math.max(1, prev - 1))}
                          disabled={newConsumersZeroOrdersPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-700">
                          Página {newConsumersZeroOrdersPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setNewConsumersZeroOrdersPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={newConsumersZeroOrdersPage === totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </main>
    </div>
  )
}

