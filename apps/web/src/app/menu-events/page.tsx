'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface MenuEventsInsights {
    totalEvents: number
    dateRange: {
        start: string
        end: string
    }
    conversionFunnel: {
        pageViews: number
        productViews: number
        addToCart: number
        checkoutStart: number
        purchases: number
    }
    conversionRates: {
        productViewToAddToCart: number
        addToCartToCheckout: number
        checkoutToPurchase: number
        overallConversion: number
    }
    topProducts: Array<{
        product_id: string
        product_name: string
        views: number
        addToCartCount: number
        purchaseCount: number
        viewToCartRate: number
        cartToPurchaseRate: number
        totalRevenue: number
    }>
    referrerPerformance: Array<{
        referrer: string
        sessions: number
        pageViews: number
        purchases: number
        conversionRate: number
        revenue: number
        averageOrderValue: number
    }>
    peakHours: Array<{
        hour: string
        eventCount: number
        purchases: number
        conversionRate: number
    }>
    deviceDistribution: Array<{
        device: string
        count: number
        percentage: number
    }>
    platformDistribution: Array<{
        platform: string
        count: number
        percentage: number
    }>
    sessionMetrics: {
        totalSessions: number
        sessionsWithPurchase: number
        sessionConversionRate: number
        averageEventsPerSession: number
        averageSessionDuration: number
    }
    abandonmentAnalysis: {
        cartAbandonments: number
        checkoutAbandonments: number
        cartAbandonmentRate: number
        checkoutAbandonmentRate: number
        averageAbandonedCartValue: number
    }
    averageCartValue: number
    averageOrderValue: number
    cached?: boolean
}

export default function MenuEventsPage() {
    const [insights, setInsights] = useState<MenuEventsInsights | null>(null)
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async (forceRefresh: boolean = false) => {
        try {
            if (forceRefresh) {
                setIsRefreshing(true)
            } else {
                setLoading(true)
            }
            setError(null)

            const response = await fetch(`${API_URL}/api/menu-events/insights`)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const result = await response.json()
            if (result.success && result.data) {
                setInsights(result.data)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
            console.error('Error fetching menu events insights:', err)
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRefresh = () => {
        fetchData(true)
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100)
    }

    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}%`
    }

    const formatMinutes = (minutes: number) => {
        if (minutes < 1) {
            return `${Math.round(minutes * 60)} segundos`
        }
        if (minutes < 60) {
            return `${Math.round(minutes)} minutos`
        }
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h ${mins}min`
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <header className="bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Análise de Eventos do Menu
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Insights sobre comportamento de navegação e conversão
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing || loading}
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
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando insights dos eventos...</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <header className="bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Análise de Eventos do Menu
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Insights sobre comportamento de navegação e conversão
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing || loading}
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <h2 className="text-red-800 text-xl font-semibold mb-2">Erro ao carregar dados</h2>
                        <p className="text-red-600">{error}</p>
                    </div>
                </main>
            </div>
        )
    }

    if (!insights) {
        return null
    }

    const funnelData = [
        {
            id: 'pageViews',
            label: 'Visualizações',
            value: insights.conversionFunnel.pageViews,
        },
        {
            id: 'productViews',
            label: 'Produtos Vistos',
            value: insights.conversionFunnel.productViews,
        },
        {
            id: 'addToCart',
            label: 'Adicionados ao Carrinho',
            value: insights.conversionFunnel.addToCart,
        },
        {
            id: 'checkoutStart',
            label: 'Checkout Iniciado',
            value: insights.conversionFunnel.checkoutStart,
        },
        {
            id: 'purchases',
            label: 'Compras',
            value: insights.conversionFunnel.purchases,
        },
    ]

    const deviceChartData = insights.deviceDistribution.map(item => ({
        id: item.device,
        label: item.device,
        value: item.count,
    }))

    const platformChartData = insights.platformDistribution.map(item => ({
        id: item.platform,
        label: item.platform,
        value: item.count,
    }))

    const peakHoursChartData = insights.peakHours.map(item => ({
        hour: item.hour,
        eventos: item.eventCount,
        compras: item.purchases,
    }))

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header className="bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Análise de Eventos do Menu
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Insights sobre comportamento de navegação e conversão
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing || loading}
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                                Duração média
                            </h3>
                            <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-4xl font-bold">
                            {formatMinutes(insights.sessionMetrics.averageSessionDuration)}
                        </p>
                        <p className="text-blue-100 text-sm mt-2">
                            tempo médio por sessão
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-purple-100 uppercase tracking-wide">
                                Ticket Médio
                            </h3>
                            <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-4xl font-bold">
                            {formatCurrency(insights.averageOrderValue)}
                        </p>
                        <p className="text-purple-100 text-sm mt-2">
                            valor médio por pedido
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-orange-100 uppercase tracking-wide">
                                Sessões Totais
                            </h3>
                            <svg className="w-8 h-8 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p className="text-4xl font-bold">
                            {insights.sessionMetrics.totalSessions.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-orange-100 text-sm mt-2">
                            sessões registradas
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-green-100 uppercase tracking-wide">
                                Conversão
                            </h3>
                            <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-4xl font-bold">
                            {formatPercentage(insights.sessionMetrics.sessionConversionRate)}
                        </p>
                        <p className="text-green-100 text-sm mt-2">
                            sessões que converteram
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Funil de Conversão</h2>
                        <div className="space-y-4">
                            {funnelData.map((step, index) => {
                                const previousValue = index > 0 ? funnelData[index - 1].value : step.value
                                const dropRate = previousValue > 0
                                    ? ((previousValue - step.value) / previousValue) * 100
                                    : 0

                                return (
                                    <div key={step.id}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">{step.label}</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {step.value.toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                                style={{
                                                    width: `${(step.value / funnelData[0].value) * 100}%`
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {formatPercentage((step.value / funnelData[0].value) * 100)}
                                                </span>
                                            </div>
                                        </div>
                                        {index > 0 && dropRate > 0 && (
                                            <p className="text-xs text-red-600 mt-1">
                                                ⚠️ {formatPercentage(dropRate)} de abandono
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Taxas de Conversão</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Produto Visto → Carrinho:</span>
                                    <span className="font-semibold text-blue-600">
                                        {formatPercentage(insights.conversionRates.productViewToAddToCart)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Carrinho → Checkout:</span>
                                    <span className="font-semibold text-blue-600">
                                        {formatPercentage(insights.conversionRates.addToCartToCheckout)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Checkout → Compra:</span>
                                    <span className="font-semibold text-blue-600">
                                        {formatPercentage(insights.conversionRates.checkoutToPurchase)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Análise de Abandono</h2>
                        <div className="space-y-6">
                            <div className="bg-red-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-red-900">Carrinhos Abandonados</h3>
                                    <span className="text-2xl">🛒</span>
                                </div>
                                <p className="text-3xl font-bold text-red-600">
                                    {insights.abandonmentAnalysis.cartAbandonments}
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                    {formatPercentage(insights.abandonmentAnalysis.cartAbandonmentRate)} dos carrinhos
                                </p>
                                <div className="mt-3 pt-3 border-t border-red-200">
                                    <p className="text-xs text-red-800">
                                        💰 Valor médio abandonado: {formatCurrency(insights.abandonmentAnalysis.averageAbandonedCartValue)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-orange-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-orange-900">Checkouts Abandonados</h3>
                                    <span className="text-2xl">💳</span>
                                </div>
                                <p className="text-3xl font-bold text-orange-600">
                                    {insights.abandonmentAnalysis.checkoutAbandonments}
                                </p>
                                <p className="text-sm text-orange-700 mt-1">
                                    {formatPercentage(insights.abandonmentAnalysis.checkoutAbandonmentRate)} dos checkouts
                                </p>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-blue-900 mb-3">💡 Oportunidades</h3>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Implementar recuperação de carrinho abandonado</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Simplificar processo de checkout</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Oferecer incentivos no checkout</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">📱 Dispositivos</h2>
                        <div className="h-80">
                            <ResponsivePie
                                data={deviceChartData}
                                margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
                                innerRadius={0.5}
                                padAngle={0.7}
                                cornerRadius={3}
                                activeOuterRadiusOffset={8}
                                colors={{ scheme: 'nivo' }}
                                borderWidth={1}
                                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                arcLinkLabelsSkipAngle={10}
                                arcLinkLabelsTextColor="#333333"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">💻 Plataformas</h2>
                        <div className="h-80">
                            <ResponsivePie
                                data={platformChartData}
                                margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
                                innerRadius={0.5}
                                padAngle={0.7}
                                cornerRadius={3}
                                activeOuterRadiusOffset={8}
                                colors={{ scheme: 'set2' }}
                                borderWidth={1}
                                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                arcLinkLabelsSkipAngle={10}
                                arcLinkLabelsTextColor="#333333"
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsColor={{ from: 'color' }}
                                arcLabelsSkipAngle={10}
                                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🕐 Horários de Pico</h2>
                    <div className="h-96">
                        <ResponsiveBar
                            data={peakHoursChartData}
                            keys={['eventos', 'compras']}
                            indexBy="hour"
                            margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                            padding={0.3}
                            valueScale={{ type: 'linear' }}
                            indexScale={{ type: 'band', round: true }}
                            colors={{ scheme: 'nivo' }}
                            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: -45,
                                legend: 'Horário',
                                legendPosition: 'middle',
                                legendOffset: 40,
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Quantidade',
                                legendPosition: 'middle',
                                legendOffset: -50,
                            }}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                            legends={[
                                {
                                    dataFrom: 'keys',
                                    anchor: 'bottom-right',
                                    direction: 'column',
                                    justify: false,
                                    translateX: 120,
                                    translateY: 0,
                                    itemsSpacing: 2,
                                    itemWidth: 100,
                                    itemHeight: 20,
                                    itemDirection: 'left-to-right',
                                    itemOpacity: 0.85,
                                    symbolSize: 20,
                                    effects: [
                                        {
                                            on: 'hover',
                                            style: {
                                                itemOpacity: 1,
                                            },
                                        },
                                    ],
                                },
                            ]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Top 10 Produtos do Menu</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Produto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Visualizações
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Add to Cart
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Taxa View→Cart
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {insights.topProducts.slice(0, 10).map((product, index) => (
                                    <tr key={product.product_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            <div className="flex items-center">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-3">
                                                    {index + 1}
                                                </span>
                                                <span className="max-w-md truncate">{product.product_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.views.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.addToCartCount.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                product.viewToCartRate >= 50 ? 'bg-green-100 text-green-800' :
                                                product.viewToCartRate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {formatPercentage(product.viewToCartRate)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}

