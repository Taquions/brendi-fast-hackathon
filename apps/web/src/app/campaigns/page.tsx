'use client'

import { useState, useEffect } from 'react'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import Navigation from '@/components/Navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SummaryData {
    total_campaigns: number
    total_results: number
    total_custom_campaigns: number
    cached?: boolean
}

interface PerformanceData {
    performance: Array<{
        targeting: string
        total_sent: number
        total_success: number
        total_errors: number
        campaigns_count: number
        success_rate: number
        error_rate: number
    }>
    cached?: boolean
}

interface ConversionData {
    campaigns_with_data: number
    average_conversion_rate: number | null
    by_targeting: Array<{
        targeting: string
        average_conversion: number
        campaigns_count: number
        min_conversion: number
        max_conversion: number
    }>
    cached?: boolean
}

interface RevenueData {
    total_revenue: number
    total_orders: number
    average_ticket: number
    by_targeting: Array<{
        targeting: string
        total_revenue: number
        total_orders: number
        campaigns_count: number
        average_ticket: number
        revenue_per_campaign: number
    }>
    cached?: boolean
}

interface VoucherData {
    with_voucher: number
    without_voucher: number
    voucher_percentage: number
    voucher_types: Array<{
        type: string
        count: number
        percentage: number
    }>
    discount_ranges: Array<{
        range: string
        count: number
    }>
    cached?: boolean
}

interface CustomAnalysisData {
    total: number
    by_targeting: Array<{
        targeting: string
        count: number
        percentage: number
    }>
    by_risk_level: Array<{
        level: string
        count: number
        percentage: number
    }>
    by_status: Array<{
        status: string
        count: number
        percentage: number
    }>
    with_media: number
    with_voucher: number
    media_percentage: number
    cached?: boolean
}

interface TopPerformingData {
    top_by_success_rate: Array<{
        campaign_id: string
        targeting: string
        success_rate: number
        total_sent: number
    }>
    top_by_revenue: Array<{
        campaign_id: string
        targeting: string
        revenue: number
        orders: number
    }>
    top_by_conversion: Array<{
        campaign_id: string
        targeting: string
        conversion_rate: number
    }>
    cached?: boolean
}

export default function CampaignsPage() {
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [performance, setPerformance] = useState<PerformanceData | null>(null)
    const [conversion, setConversion] = useState<ConversionData | null>(null)
    const [revenue, setRevenue] = useState<RevenueData | null>(null)
    const [voucher, setVoucher] = useState<VoucherData | null>(null)
    const [customAnalysis, setCustomAnalysis] = useState<CustomAnalysisData | null>(null)
    const [topPerforming, setTopPerforming] = useState<TopPerformingData | null>(null)
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
            const [summaryRes, performanceRes, conversionRes, revenueRes, voucherRes, customRes, topRes] = await Promise.all([
                fetch(`${API_URL}/api/campaigns/summary`),
                fetch(`${API_URL}/api/campaigns/performance`),
                fetch(`${API_URL}/api/campaigns/conversion`),
                fetch(`${API_URL}/api/campaigns/revenue`),
                fetch(`${API_URL}/api/campaigns/vouchers`),
                fetch(`${API_URL}/api/campaigns/custom-analysis`),
                fetch(`${API_URL}/api/campaigns/top-performing`),
            ])

            if (!summaryRes.ok) throw new Error('Failed to fetch summary')
            if (!performanceRes.ok) throw new Error('Failed to fetch performance')
            if (!conversionRes.ok) throw new Error('Failed to fetch conversion')
            if (!revenueRes.ok) throw new Error('Failed to fetch revenue')
            if (!voucherRes.ok) throw new Error('Failed to fetch voucher')
            if (!customRes.ok) throw new Error('Failed to fetch custom analysis')
            if (!topRes.ok) throw new Error('Failed to fetch top performing')

            const summaryData = await summaryRes.json()
            const performanceData = await performanceRes.json()
            const conversionData = await conversionRes.json()
            const revenueData = await revenueRes.json()
            const voucherData = await voucherRes.json()
            const customData = await customRes.json()
            const topData = await topRes.json()

            setSummary(summaryData.data)
            setPerformance(performanceData.data)
            setConversion(conversionData.data)
            setRevenue(revenueData.data)
            setVoucher(voucherData.data)
            setCustomAnalysis(customData.data)
            setTopPerforming(topData.data)
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

    const isValidNumber = (value: any): value is number => {
        return typeof value === 'number' && 
               !isNaN(value) && 
               isFinite(value) && 
               value >= 0
    }

    const formatNumber = (num: number | null | undefined) => {
        if (!isValidNumber(num)) {
            return '—'
        }
        return new Intl.NumberFormat('pt-BR').format(num)
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (!isValidNumber(value)) {
            return 'R$ 0,00'
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 2,
        }).format(value)
    }

    const formatPercentage = (value: number | null | undefined) => {
        if (!isValidNumber(value)) {
            return '0.00%'
        }
        return `${Math.min(100, Math.max(0, value)).toFixed(2)}%`
    }

    const getTargetingColor = (targeting: string) => {
        const colors: Record<string, string> = {
            'recurrent': '#3B82F6',
            'loyal': '#10B981',
            'beginner': '#F59E0B',
            'enthusiast': '#8B5CF6',
            'curious': '#EC4899',
            'hot': '#EF4444',
        }
        return colors[targeting] || '#6B7280'
    }

    const conversionBarData = conversion?.by_targeting.slice(0, 8)
        .filter(item => isValidNumber(item.average_conversion))
        .map(item => ({
            targeting: item.targeting,
            'Conversão Média': Math.round(Math.max(0, item.average_conversion) * 100) / 100,
        })) || []

    const voucherPieData = voucher ? [
        {
            id: 'Com Voucher',
            label: 'Com Voucher',
            value: voucher.with_voucher,
            color: '#10B981',
        },
        {
            id: 'Sem Voucher',
            label: 'Sem Voucher',
            value: voucher.without_voucher,
            color: '#6B7280',
        },
    ] : []

    const customTargetingPieData = customAnalysis?.by_targeting.slice(0, 6).map(item => ({
        id: item.targeting,
        label: item.targeting,
        value: item.count,
        color: getTargetingColor(item.targeting),
    })) || []

    const riskLevelPieData = customAnalysis?.by_risk_level.map(item => ({
        id: item.level,
        label: item.level,
        value: item.count,
        color: item.level === 'high' ? '#EF4444' : item.level === 'medium' ? '#F59E0B' : '#10B981',
    })) || []

    const campaignsByTargetingPieData = performance?.performance
        .filter(item => isValidNumber(item.total_sent) && item.total_sent > 0)
        .map(item => ({
            id: item.targeting,
            label: item.targeting,
            value: item.total_sent,
            color: getTargetingColor(item.targeting),
        })) || []

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header className="bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Análise de Campanhas
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Performance, conversão e insights estratégicos
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                                        Total Campanhas
                                    </h3>
                                    <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {summary ? formatNumber(summary.total_campaigns) : '—'}
                                </p>
                                <p className="text-blue-100 text-sm">
                                    campanhas enviadas
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-emerald-100 uppercase tracking-wide">
                                        Total de Envios com Sucesso
                                    </h3>
                                    <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {formatNumber(performance?.performance.reduce((sum, item) => sum + (isValidNumber(item.total_success) ? item.total_success : 0), 0) || 0)}
                                </p>
                                <p className="text-emerald-100 text-sm">
                                    envios bem-sucedidos
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-purple-100 uppercase tracking-wide">
                                        Conversão Média
                                    </h3>
                                    <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {conversion?.average_conversion_rate !== null && conversion?.average_conversion_rate !== undefined && isValidNumber(conversion.average_conversion_rate)
                                        ? formatPercentage(conversion.average_conversion_rate) 
                                        : 'N/A'}
                                </p>
                                <p className="text-purple-100 text-sm">
                                    taxa de conversão
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-orange-100 uppercase tracking-wide">
                                        Customizadas
                                    </h3>
                                    <svg className="w-8 h-8 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <p className="text-4xl font-bold mb-1">
                                    {summary ? formatNumber(summary.total_custom_campaigns) : '—'}
                                </p>
                                <p className="text-orange-100 text-sm">
                                    campanhas personalizadas
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Total de Campanhas Enviadas por Segmentação
                                </h2>
                                <div className="h-96">
                                    <ResponsivePie
                                        data={campaignsByTargetingPieData}
                                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                                        innerRadius={0.5}
                                        padAngle={0.7}
                                        cornerRadius={3}
                                        activeOuterRadiusOffset={8}
                                        colors={{ datum: 'data.color' }}
                                        borderWidth={1}
                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="#333333"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: 'color' }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor="#ffffff"
                                        arcLabel={(d) => `${formatNumber(d.value)}`}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Uso de Vouchers
                                </h2>
                                <div className="h-96">
                                    <ResponsivePie
                                        data={voucherPieData}
                                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                                        innerRadius={0.5}
                                        padAngle={0.7}
                                        cornerRadius={3}
                                        activeOuterRadiusOffset={8}
                                        colors={{ datum: 'data.color' }}
                                        borderWidth={1}
                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="#333333"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: 'color' }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor="#ffffff"
                                        arcLabel={(d) => `${d.value}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Campanhas Customizadas por Segmento
                                </h2>
                                <div className="h-96">
                                    <ResponsivePie
                                        data={customTargetingPieData}
                                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                                        innerRadius={0.5}
                                        padAngle={0.7}
                                        cornerRadius={3}
                                        activeOuterRadiusOffset={8}
                                        colors={{ datum: 'data.color' }}
                                        borderWidth={1}
                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="#333333"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: 'color' }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor="#ffffff"
                                        arcLabel={(d) => `${d.value}`}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Nível de Risco - Campanhas Customizadas
                                </h2>
                                <div className="h-96">
                                    <ResponsivePie
                                        data={riskLevelPieData}
                                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                                        innerRadius={0.5}
                                        padAngle={0.7}
                                        cornerRadius={3}
                                        activeOuterRadiusOffset={8}
                                        colors={{ datum: 'data.color' }}
                                        borderWidth={1}
                                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="#333333"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: 'color' }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor="#ffffff"
                                        arcLabel={(d) => `${d.value}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Conversão por Segmentação
                            </h2>
                            <div className="h-96">
                                <ResponsiveBar
                                    data={conversionBarData}
                                    keys={['Conversão Média']}
                                    indexBy="targeting"
                                    margin={{ top: 20, right: 20, bottom: 80, left: 60 }}
                                    padding={0.3}
                                    valueScale={{ type: 'linear' }}
                                    colors="#8B5CF6"
                                    borderRadius={4}
                                    valueFormat={(value) => `${Number(value).toFixed(2)}`}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: -45,
                                        legend: 'Segmentação',
                                        legendPosition: 'middle',
                                        legendOffset: 60,
                                    }}
                                    axisLeft={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Conversão (%)',
                                        legendPosition: 'middle',
                                        legendOffset: -50,
                                    }}
                                    labelSkipWidth={12}
                                    labelSkipHeight={12}
                                    labelTextColor="#ffffff"
                                    animate={true}
                                />
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

