'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import Navigation from '@/components/Navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

interface PaymentTypesResponse {
    success: boolean
    data: {
        paymentTypes: Array<{
            type: string
            count: number
            percentage: number
        }>
        total: number
        cached?: boolean
    }
}

interface DeliveryStatsResponse {
    success: boolean
    data: {
        deliveryTypes: Array<{
            type: string
            count: number
            percentage: number
        }>
        timeRanges: Array<{
            range: string
            count: number
            percentage: number
            averageTime: number
        }>
        priceRanges: Array<{
            range: string
            count: number
            percentage: number
            averagePrice: number
        }>
        cached?: boolean
    }
}

interface MotoboysResponse {
    success: boolean
    data: {
        motoboys: Array<{
            name: string
            ordersCount: number
            percentage: number
        }>
        total: number
        cached?: boolean
    }
}

interface OrdersByDayResponse {
    success: boolean
    data: {
        data: Array<{
            date: string
            count: number
        }>
        cached?: boolean
    }
}

export default function OrdersPage() {
    const [totalOrders, setTotalOrders] = useState<number | null>(null)
    const [totalRevenueInCents, setTotalRevenueInCents] = useState<number | null>(null)
    const [mostOrderedProducts, setMostOrderedProducts] = useState<Array<{
        name: string
        occurrences: number
        totalQuantity: number
    }>>([])
    const [paymentTypes, setPaymentTypes] = useState<Array<{
        type: string
        count: number
        percentage: number
    }>>([])
    const [deliveryStats, setDeliveryStats] = useState<{
        deliveryTypes: Array<{ type: string; count: number; percentage: number }>
        timeRanges: Array<{ range: string; count: number; percentage: number; averageTime: number }>
        priceRanges: Array<{ range: string; count: number; percentage: number; averagePrice: number }>
    } | null>(null)
    const [motoboys, setMotoboys] = useState<Array<{
        name: string
        ordersCount: number
        percentage: number
    }>>([])
    const [ordersByDay, setOrdersByDay] = useState<Array<{
        date: string
        count: number
    }>>([])
    const [isPaymentChartExpanded, setIsPaymentChartExpanded] = useState(false)
    const [isDeliveryChartExpanded, setIsDeliveryChartExpanded] = useState(false)
    const [isMotoboysExpanded, setIsMotoboysExpanded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (forceRefresh: boolean = false) => {
        try {
            if (forceRefresh) {
                setIsRefreshing(true)
            } else {
                setIsLoading(true)
            }
            setError(null)
            const [ordersRes, revenueRes, mostOrderedRes, paymentTypesRes, deliveryRes, motoboysRes, ordersByDayRes] = await Promise.all([
                fetch(`${API_URL}/api/orders/total`),
                fetch(`${API_URL}/api/orders/revenue`),
                fetch(`${API_URL}/api/orders/most-ordered`),
                fetch(`${API_URL}/api/orders/payment-types`),
                fetch(`${API_URL}/api/orders/delivery`),
                fetch(`${API_URL}/api/orders/motoboys`),
                fetch(`${API_URL}/api/orders/by-day`),
            ])

            if (!ordersRes.ok) throw new Error('Failed to fetch orders total')
            if (!revenueRes.ok) throw new Error('Failed to fetch revenue total')
            if (!mostOrderedRes.ok) throw new Error('Failed to fetch most ordered products')
            if (!paymentTypesRes.ok) throw new Error('Failed to fetch payment types')
            if (!deliveryRes.ok) throw new Error('Failed to fetch delivery stats')
            if (!motoboysRes.ok) throw new Error('Failed to fetch motoboys stats')
            if (!ordersByDayRes.ok) throw new Error('Failed to fetch orders by day')

            const ordersData: OrdersTotalResponse = await ordersRes.json()
            const revenueData: OrdersRevenueResponse = await revenueRes.json()
            const mostOrderedData: MostOrderedProductsResponse = await mostOrderedRes.json()
            const paymentTypesData: PaymentTypesResponse = await paymentTypesRes.json()
            const deliveryData: DeliveryStatsResponse = await deliveryRes.json()
            const motoboysData: MotoboysResponse = await motoboysRes.json()
            const ordersByDayData: OrdersByDayResponse = await ordersByDayRes.json()

            if (!ordersData.success || !ordersData.data) throw new Error('Invalid orders response')
            if (!revenueData.success || !revenueData.data) throw new Error('Invalid revenue response')
            if (!mostOrderedData.success || !mostOrderedData.data) throw new Error('Invalid most ordered products response')
            if (!paymentTypesData.success || !paymentTypesData.data) throw new Error('Invalid payment types response')
            if (!deliveryData.success || !deliveryData.data) throw new Error('Invalid delivery stats response')
            if (!motoboysData.success || !motoboysData.data) throw new Error('Invalid motoboys response')
            if (!ordersByDayData.success || !ordersByDayData.data) throw new Error('Invalid orders by day response')

            setTotalOrders(ordersData.data.total)
            setTotalRevenueInCents(revenueData.data.amountInCents)
            setMostOrderedProducts(mostOrderedData.data.products.slice(0, 10))
            setPaymentTypes(paymentTypesData.data.paymentTypes)
            setDeliveryStats(deliveryData.data)
            setMotoboys(motoboysData.data.motoboys)
            setOrdersByDay(ordersByDayData.data.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
            console.error('Error fetching data:', err)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = () => {
        fetchData(true)
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('pt-BR').format(num)
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 2,
        }).format(cents / 100)
    }

    const calculateAverageTicket = () => {
        if (totalOrders === null || totalRevenueInCents === null || totalOrders === 0) {
            return null
        }
        return totalRevenueInCents / totalOrders
    }

    const averageTicket = calculateAverageTicket()

    const getPaymentTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Pix Online': '#00D9FF',
            'Pix': '#00B8D4',
            'Crédito Online': '#10B981',
            'Crédito': '#059669',
            'Débito Online': '#3B82F6',
            'Débito': '#2563EB',
            'Dinheiro': '#F59E0B',
        }
        return colors[type] || '#6B7280'
    }

    const pieData = paymentTypes.map((item) => ({
        id: item.type,
        label: item.type,
        value: item.count,
        color: getPaymentTypeColor(item.type),
    }))

    const getDeliveryTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Entrega': '#3B82F6',
            'Retirada': '#10B981',
            'Consumo no Local': '#F59E0B',
        }
        return colors[type] || '#6B7280'
    }

    const deliveryTypePieData = deliveryStats?.deliveryTypes.map((item) => ({
        id: item.type,
        label: item.type,
        value: item.count,
        color: getDeliveryTypeColor(item.type),
    })) || []

    const timeBarData = deliveryStats?.timeRanges.map((item) => ({
        range: item.range,
        count: item.count,
        'Tempo Médio': Math.round(item.averageTime),
    })) || []

    const priceBarData = deliveryStats?.priceRanges.map((item) => ({
        range: item.range,
        count: item.count,
        'Preço Médio': Math.round(item.averagePrice / 100),
    })) || []

    const getMaxValue = (data: Array<{ count: number }>) => {
        if (data.length === 0) return 100
        const max = Math.max(...data.map(d => d.count))
        return Math.ceil(max * 1.1)
    }

    const maxTimeValue = getMaxValue(timeBarData)
    const maxPriceValue = getMaxValue(priceBarData)

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const lineChartData = ordersByDay.map((item) => ({
        x: formatDate(item.date),
        y: item.count,
    }))

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header className="bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Análise de Pedidos
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Métricas e produtos mais vendidos
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
                        <p className="mt-4 text-gray-600">Carregando dados...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <p className="text-red-800">Erro ao carregar dados: {error}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                                        Total de Pedidos
                                    </h3>
                                    <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {totalOrders !== null ? formatNumber(totalOrders) : '—'}
                                </p>
                                <p className="text-blue-100 text-sm">
                                    pedidos registrados
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-emerald-100 uppercase tracking-wide">
                                        Ticket Médio
                                    </h3>
                                    <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {averageTicket !== null ? formatCurrency(averageTicket) : '—'}
                                </p>
                                <p className="text-emerald-100 text-sm">
                                    valor médio por pedido
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Pedidos dos Últimos 30 Dias
                                </h2>
                            </div>
                            {ordersByDay.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum dado encontrado</p>
                            ) : (
                                <div className="h-96">
                                    <ResponsiveLine
                                        data={[
                                            {
                                                id: 'pedidos',
                                                color: '#3B82F6',
                                                data: lineChartData,
                                            },
                                        ]}
                                        margin={{ top: 20, right: 50, bottom: 60, left: 60 }}
                                        xScale={{ type: 'point' }}
                                        yScale={{
                                            type: 'linear',
                                            min: 'auto',
                                            max: 'auto',
                                            stacked: false,
                                            reverse: false,
                                        }}
                                        curve="monotoneX"
                                        axisTop={null}
                                        axisRight={null}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: -45,
                                            legend: 'Data',
                                            legendPosition: 'middle',
                                            legendOffset: 50,
                                            tickValues: lineChartData.filter((_, i) => i % 5 === 0).map(d => d.x),
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            tickRotation: 0,
                                            legend: 'Número de Pedidos',
                                            legendPosition: 'middle',
                                            legendOffset: -50,
                                        }}
                                        pointSize={6}
                                        pointColor={{ theme: 'background' }}
                                        pointBorderWidth={2}
                                        pointBorderColor={{ from: 'serieColor' }}
                                        pointLabelYOffset={-12}
                                        enableArea={true}
                                        areaOpacity={0.1}
                                        useMesh={true}
                                        colors={['#3B82F6']}
                                        tooltip={({ point }) => (
                                            <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                                                <div className="font-semibold text-gray-900">{String(point.data.x)}</div>
                                                <div className="text-blue-600 font-bold">
                                                    {formatNumber(point.data.y as number)} pedidos
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Tipos de Pagamento
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsPaymentChartExpanded(!isPaymentChartExpanded)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        {isPaymentChartExpanded ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                                Reduzir
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                Expandir
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {paymentTypes.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum dado de pagamento encontrado</p>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="h-96">
                                        <ResponsivePie
                                            data={pieData}
                                            margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
                                            innerRadius={0.5}
                                            padAngle={2}
                                            cornerRadius={4}
                                            activeOuterRadiusOffset={8}
                                            colors={{ datum: 'data.color' }}
                                            borderWidth={2}
                                            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                            arcLinkLabelsSkipAngle={10}
                                            arcLinkLabelsTextColor="#333333"
                                            arcLinkLabelsThickness={2}
                                            arcLinkLabelsColor={{ from: 'color' }}
                                            arcLabelsSkipAngle={10}
                                            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                                        />
                                    </div>
                                    {isPaymentChartExpanded ? (
                                        <div className="flex flex-col justify-center">
                                            <div className="space-y-4">
                                                {paymentTypes.map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <div
                                                                className="w-4 h-4 rounded-full"
                                                                style={{ backgroundColor: getPaymentTypeColor(item.type) }}
                                                            />
                                                            <span className="text-sm font-medium text-gray-900">{item.type}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {formatNumber(item.count)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {item.percentage.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col justify-center">
                                            <div className="space-y-4">
                                                {paymentTypes.slice(0, 3).map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <div
                                                                className="w-4 h-4 rounded-full"
                                                                style={{ backgroundColor: getPaymentTypeColor(item.type) }}
                                                            />
                                                            <span className="text-sm font-medium text-gray-900">{item.type}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {formatNumber(item.count)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {item.percentage.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Análise de Entrega
                                </h2>
                                <button
                                    onClick={() => setIsDeliveryChartExpanded(!isDeliveryChartExpanded)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                >
                                    {isDeliveryChartExpanded ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            Reduzir
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Expandir
                                        </>
                                    )}
                                </button>
                            </div>

                            {isDeliveryChartExpanded ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tipos de Pedidos</h3>
                                            {deliveryStats && deliveryStats.deliveryTypes.length > 0 ? (
                                                <div className="h-64">
                                                    <ResponsivePie
                                                        data={deliveryTypePieData}
                                                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                                        innerRadius={0.5}
                                                        padAngle={2}
                                                        cornerRadius={4}
                                                        activeOuterRadiusOffset={8}
                                                        colors={{ datum: 'data.color' }}
                                                        borderWidth={2}
                                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                                        arcLinkLabelsSkipAngle={10}
                                                        arcLinkLabelsTextColor="#333333"
                                                        arcLinkLabelsThickness={2}
                                                        arcLinkLabelsColor={{ from: 'color' }}
                                                        arcLabelsSkipAngle={10}
                                                        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-center py-8">Sem dados</p>
                                            )}
                                            {deliveryStats && deliveryStats.deliveryTypes.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    {deliveryStats.deliveryTypes.map((item, index) => (
                                                        <div key={index} className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center space-x-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: getDeliveryTypeColor(item.type) }}
                                                                />
                                                                <span className="text-gray-700">{item.type}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-semibold text-gray-900">{formatNumber(item.count)}</span>
                                                                <span className="text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tempo Médio de Entrega</h3>
                                        {deliveryStats && deliveryStats.timeRanges.length > 0 ? (
                                            <div className="h-80">
                                                <ResponsiveBar
                                                    data={timeBarData}
                                                    keys={['count']}
                                                    indexBy="range"
                                                    margin={{ top: 20, right: 40, bottom: 80, left: 80 }}
                                                    padding={0.4}
                                                    colors={['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']}
                                                    maxValue={maxTimeValue}
                                                    axisBottom={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        legend: 'Faixa de Tempo',
                                                        legendPosition: 'middle',
                                                        legendOffset: 60,
                                                    }}
                                                    axisLeft={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        legend: 'Quantidade de Pedidos',
                                                        legendPosition: 'middle',
                                                        legendOffset: -60,
                                                        tickValues: 5,
                                                    }}
                                                    labelSkipWidth={12}
                                                    labelSkipHeight={12}
                                                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                                    tooltip={({ value, indexValue }) => (
                                                        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                                                            <div className="font-semibold">{indexValue}</div>
                                                            <div>Pedidos: {formatNumber(value as number)}</div>
                                                            {deliveryStats?.timeRanges.find(r => r.range === indexValue) && (
                                                                <div>
                                                                    Tempo médio: {Math.round(deliveryStats.timeRanges.find(r => r.range === indexValue)!.averageTime)} min
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">Sem dados</p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preço de Entrega</h3>
                                        {deliveryStats && deliveryStats.priceRanges.length > 0 ? (
                                            <div className="h-80">
                                                <ResponsiveBar
                                                    data={priceBarData}
                                                    keys={['count']}
                                                    indexBy="range"
                                                    margin={{ top: 20, right: 40, bottom: 80, left: 80 }}
                                                    padding={0.4}
                                                    colors={['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']}
                                                    maxValue={maxPriceValue}
                                                    axisBottom={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        legend: 'Faixa de Preço',
                                                        legendPosition: 'middle',
                                                        legendOffset: 60,
                                                    }}
                                                    axisLeft={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        legend: 'Quantidade de Pedidos',
                                                        legendPosition: 'middle',
                                                        legendOffset: -60,
                                                        tickValues: 5,
                                                    }}
                                                    labelSkipWidth={12}
                                                    labelSkipHeight={12}
                                                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                                    tooltip={({ value, indexValue }) => (
                                                        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                                                            <div className="font-semibold">{indexValue}</div>
                                                            <div>Pedidos: {formatNumber(value as number)}</div>
                                                            {deliveryStats?.priceRanges.find(r => r.range === indexValue) && (
                                                                <div>
                                                                    Preço médio: {formatCurrency(deliveryStats.priceRanges.find(r => r.range === indexValue)!.averagePrice)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">Sem dados</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tipos de Pedidos</h3>
                                        {deliveryStats && deliveryStats.deliveryTypes.length > 0 ? (
                                            <div className="h-64">
                                                <ResponsivePie
                                                    data={deliveryTypePieData}
                                                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                                    innerRadius={0.5}
                                                    padAngle={2}
                                                    cornerRadius={4}
                                                    activeOuterRadiusOffset={8}
                                                    colors={{ datum: 'data.color' }}
                                                    borderWidth={2}
                                                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                                    enableArcLinkLabels={false}
                                                    enableArcLabels={false}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">Sem dados</p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tempo Médio de Entrega</h3>
                                        {deliveryStats && deliveryStats.timeRanges.length > 0 ? (
                                            <div className="h-64">
                                                <ResponsiveBar
                                                    data={timeBarData}
                                                    keys={['count']}
                                                    indexBy="range"
                                                    margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                                                    padding={0.4}
                                                    colors={['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']}
                                                    maxValue={maxTimeValue}
                                                    axisBottom={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: -45,
                                                    }}
                                                    axisLeft={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        tickValues: 4,
                                                    }}
                                                    enableLabel={false}
                                                    tooltip={({ value, indexValue }) => (
                                                        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                                                            <div className="font-semibold">{indexValue}</div>
                                                            <div>Pedidos: {formatNumber(value as number)}</div>
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">Sem dados</p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preço de Entrega</h3>
                                        {deliveryStats && deliveryStats.priceRanges.length > 0 ? (
                                            <div className="h-64">
                                                <ResponsiveBar
                                                    data={priceBarData}
                                                    keys={['count']}
                                                    indexBy="range"
                                                    margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                                                    padding={0.4}
                                                    colors={['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']}
                                                    maxValue={maxPriceValue}
                                                    axisBottom={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: -45,
                                                    }}
                                                    axisLeft={{
                                                        tickSize: 5,
                                                        tickPadding: 5,
                                                        tickRotation: 0,
                                                        tickValues: 4,
                                                    }}
                                                    enableLabel={false}
                                                    tooltip={({ value, indexValue }) => (
                                                        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                                                            <div className="font-semibold">{indexValue}</div>
                                                            <div>Pedidos: {formatNumber(value as number)}</div>
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">Sem dados</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Pedidos por Motoboy
                                </h2>
                                <button
                                    onClick={() => setIsMotoboysExpanded(!isMotoboysExpanded)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                >
                                    {isMotoboysExpanded ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            Reduzir
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Expandir
                                        </>
                                    )}
                                </button>
                            </div>

                            {motoboys.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum dado de motoboy encontrado</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Posição
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Motoboy
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Pedidos
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Percentual
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {(isMotoboysExpanded ? motoboys : motoboys.slice(0, 3)).map((motoboy, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {index + 1}º
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {motoboy.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 font-semibold">
                                                            {formatNumber(motoboy.ordersCount)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            pedidos
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 font-semibold">
                                                            {motoboy.percentage.toFixed(2)}%
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Top 10 Produtos Mais Vendidos
                                </h2>
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>

                            {mostOrderedProducts.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum produto encontrado</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Posição
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Produto
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Pedidos
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Quantidade Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {mostOrderedProducts.map((product, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {index + 1}º
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {product.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 font-semibold">
                                                            {formatNumber(product.occurrences)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            pedidos
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 font-semibold">
                                                            {formatNumber(product.totalQuantity)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            unidades
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}
