import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'

function getCampaignsFilePaths() {
    const cwd = process.cwd()

    const findFile = (filename: string): string => {
        const pathsToTry = [
            resolve(cwd, `data/${filename}`),
            resolve(cwd, `../../data/${filename}`),
        ]

        for (const path of pathsToTry) {
            if (existsSync(path)) {
                return path
            }
        }

        return resolve(cwd, `data/${filename}`)
    }

    return {
        campaigns: findFile('campaigns.json'),
        results: findFile('campaigns_results.json'),
        custom: findFile('custom-campaigns.json'),
    }
}

const FILE_PATHS = getCampaignsFilePaths()
const CACHE_TTL = 5 * 60 * 1000

interface Campaign {
    id?: string
    campaign_id?: string
    store_id?: string
    status?: string
    targeting?: string
    type?: string
    use_voucher?: boolean
    voucher?: {
        type?: string
        percentageDiscount?: number
        fixedDiscount?: number
        minimumOrder?: number
        [key: string]: any
    }
    created_at?: {
        iso?: string
        [key: string]: any
    }
    [key: string]: any
}

interface CampaignResult {
    id?: string
    campaign_id?: string
    targeting?: string
    is_custom?: boolean
    send_status?: {
        errorCount?: number
        totalCount?: number
        partialCount?: number
        successCount?: number
    }
    conversion_rate?: number | null
    evasion_rate?: number | null
    total_order_value?: number | null
    orders_delivered?: number | null
    timestamp?: {
        iso?: string
        [key: string]: any
    }
    [key: string]: any
}

interface CustomCampaign {
    id?: string
    description?: string
    targeting?: string
    status?: string
    riskLevel?: string
    voucher?: any
    media?: {
        type?: string
        url?: string
    }
    [key: string]: any
}

interface CachedData<T> {
    data: T
    timestamp: number
    fileStats: {
        mtime: number
        size: number
    }
}

let campaignsCache: CachedData<Campaign[]> | null = null
let resultsCache: CachedData<CampaignResult[]> | null = null
let customCache: CachedData<CustomCampaign[]> | null = null

async function loadWithCache<T>(
    filePath: string,
    cache: CachedData<T> | null,
    setCache: (data: CachedData<T>) => void
): Promise<{ data: T; cached: boolean }> {
    const now = Date.now()

    try {
        const stats = await stat(filePath)
        const hasFileChanged = cache && (
            stats.mtimeMs !== cache.fileStats.mtime ||
            stats.size !== cache.fileStats.size
        )

        if (cache && !hasFileChanged && (now - cache.timestamp) < CACHE_TTL) {
            return { data: cache.data, cached: true }
        }

        const fileContent = await readFile(filePath, 'utf8')
        const data = JSON.parse(fileContent) as T

        setCache({
            data,
            timestamp: now,
            fileStats: {
                mtime: stats.mtimeMs,
                size: stats.size,
            },
        })

        return { data, cached: false }
    } catch (error) {
        if (cache) {
            return { data: cache.data, cached: true }
        }
        throw error
    }
}

async function loadCampaigns() {
    return loadWithCache(FILE_PATHS.campaigns, campaignsCache, (data) => {
        campaignsCache = data
    })
}

async function loadResults() {
    return loadWithCache(FILE_PATHS.results, resultsCache, (data) => {
        resultsCache = data
    })
}

async function loadCustom() {
    return loadWithCache(FILE_PATHS.custom, customCache, (data) => {
        customCache = data
    })
}

function isValidNumber(value: any): value is number {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) && 
           value >= 0 &&
           value <= Number.MAX_SAFE_INTEGER
}

function sanitizeNumber(value: any, defaultValue: number = 0): number {
    if (!isValidNumber(value)) {
        return defaultValue
    }
    return value
}

function filterByDateRange<T extends { created_at?: { iso?: string }; timestamp?: { iso?: string };[key: string]: any }>(
    items: T[],
    startDate?: string,
    endDate?: string
): T[] {
    if (!startDate && !endDate) {
        return items
    }

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    return items.filter(item => {
        const dateStr = item.created_at?.iso || item.timestamp?.iso
        if (!dateStr) {
            return false
        }
        const itemDate = new Date(dateStr)
        if (start && itemDate < start) {
            return false
        }
        if (end && itemDate > end) {
            return false
        }
        return true
    })
}

export async function getCampaignsSummary(startDate?: string, endDate?: string) {
    const [campaigns, results, custom] = await Promise.all([
        loadCampaigns(),
        loadResults(),
        loadCustom(),
    ])

    const filteredCampaigns = filterByDateRange(campaigns.data, startDate, endDate)
    const filteredResults = filterByDateRange(results.data, startDate, endDate)
    const filteredCustom = filterByDateRange(custom.data, startDate, endDate)

    return {
        total_campaigns: filteredCampaigns.length,
        total_results: filteredResults.length,
        total_custom_campaigns: filteredCustom.length,
        cached: campaigns.cached && results.cached && custom.cached,
    }
}

export async function getPerformanceByTargeting(startDate?: string, endDate?: string) {
    const results = await loadResults()
    const filteredResults = filterByDateRange(results.data, startDate, endDate)

    const targetingStats: Record<string, {
        total_sent: number
        total_success: number
        total_errors: number
        campaigns_count: number
    }> = {}

    for (const result of filteredResults) {
        const targeting = result.targeting || 'unknown'
        const sendStatus = result.send_status

        if (!targetingStats[targeting]) {
            targetingStats[targeting] = {
                total_sent: 0,
                total_success: 0,
                total_errors: 0,
                campaigns_count: 0,
            }
        }

        if (sendStatus) {
            const totalCount = sanitizeNumber(sendStatus.totalCount, 0)
            const successCount = sanitizeNumber(sendStatus.successCount, 0)
            const errorCount = sanitizeNumber(sendStatus.errorCount, 0)
            
            targetingStats[targeting].total_sent += totalCount
            targetingStats[targeting].total_success += successCount
            targetingStats[targeting].total_errors += errorCount
        }
        targetingStats[targeting].campaigns_count++
    }

    const performance = Object.entries(targetingStats).map(([targeting, stats]) => {
        const successRate = stats.total_sent > 0 
            ? Math.min(100, Math.max(0, (stats.total_success / stats.total_sent) * 100))
            : 0
        const errorRate = stats.total_sent > 0 
            ? Math.min(100, Math.max(0, (stats.total_errors / stats.total_sent) * 100))
            : 0

        return {
            targeting,
            total_sent: stats.total_sent,
            total_success: stats.total_success,
            total_errors: stats.total_errors,
            campaigns_count: stats.campaigns_count,
            success_rate: sanitizeNumber(successRate, 0),
            error_rate: sanitizeNumber(errorRate, 0),
        }
    })

    return {
        performance: performance.sort((a, b) => b.success_rate - a.success_rate),
        cached: results.cached,
    }
}

export async function getConversionAnalysis(startDate?: string, endDate?: string) {
    const results = await loadResults()
    const filteredResults = filterByDateRange(results.data, startDate, endDate)

    const conversionData = filteredResults
        .filter(r => r.conversion_rate !== null && r.conversion_rate !== undefined)
        .map(r => ({
            ...r,
            conversion_rate: sanitizeNumber(r.conversion_rate, 0)
        }))
        .filter(r => isValidNumber(r.conversion_rate))

    if (conversionData.length === 0) {
        return {
            campaigns_with_data: 0,
            average_conversion_rate: null,
            by_targeting: {},
            cached: results.cached,
        }
    }

    const targetingConversion: Record<string, number[]> = {}

    for (const result of conversionData) {
        const targeting = result.targeting || 'unknown'
        const rate = sanitizeNumber(result.conversion_rate, 0)
        if (isValidNumber(rate)) {
            if (!targetingConversion[targeting]) {
                targetingConversion[targeting] = []
            }
            targetingConversion[targeting].push(rate)
        }
    }

    const byTargeting = Object.entries(targetingConversion).map(([targeting, rates]) => {
        const validRates = rates.filter(isValidNumber)
        if (validRates.length === 0) {
            return {
                targeting,
                average_conversion: 0,
                campaigns_count: 0,
                min_conversion: 0,
                max_conversion: 0,
            }
        }
        return {
            targeting,
            average_conversion: sanitizeNumber(validRates.reduce((sum, r) => sum + r, 0) / validRates.length, 0),
            campaigns_count: validRates.length,
            min_conversion: sanitizeNumber(Math.min(...validRates), 0),
            max_conversion: sanitizeNumber(Math.max(...validRates), 0),
        }
    })

    const allRates = conversionData
        .map(r => sanitizeNumber(r.conversion_rate, 0))
        .filter(isValidNumber)
    
    const averageConversion = allRates.length > 0
        ? sanitizeNumber(allRates.reduce((sum, r) => sum + r, 0) / allRates.length, 0)
        : 0

    return {
        campaigns_with_data: conversionData.length,
        average_conversion_rate: averageConversion > 0 ? averageConversion : null,
        by_targeting: byTargeting.sort((a, b) => b.average_conversion - a.average_conversion),
        cached: results.cached,
    }
}

export async function getRevenueAnalysis(startDate?: string, endDate?: string) {
    const results = await loadResults()
    const filteredResults = filterByDateRange(results.data, startDate, endDate)

    let totalRevenue = 0
    let totalOrders = 0
    const revenueByTargeting: Record<string, {
        revenue: number
        orders: number
        campaigns: number
    }> = {}

    for (const result of filteredResults) {
        const targeting = result.targeting || 'unknown'
        const revenue = sanitizeNumber(result.total_order_value, 0)
        const orders = sanitizeNumber(result.orders_delivered, 0)

        if (isValidNumber(revenue) && isValidNumber(orders)) {
            totalRevenue += revenue
            totalOrders += orders

            if (!revenueByTargeting[targeting]) {
                revenueByTargeting[targeting] = { revenue: 0, orders: 0, campaigns: 0 }
            }

            revenueByTargeting[targeting].revenue += revenue
            revenueByTargeting[targeting].orders += orders
            revenueByTargeting[targeting].campaigns++
        }
    }

    const byTargeting = Object.entries(revenueByTargeting).map(([targeting, data]) => {
        const avgTicket = data.orders > 0 && isValidNumber(data.revenue / data.orders)
            ? sanitizeNumber(data.revenue / data.orders, 0)
            : 0
        const revenuePerCampaign = data.campaigns > 0 && isValidNumber(data.revenue / data.campaigns)
            ? sanitizeNumber(data.revenue / data.campaigns, 0)
            : 0

        return {
            targeting,
            total_revenue: sanitizeNumber(data.revenue, 0),
            total_orders: sanitizeNumber(data.orders, 0),
            campaigns_count: data.campaigns,
            average_ticket: avgTicket,
            revenue_per_campaign: revenuePerCampaign,
        }
    })

    const finalTotalRevenue = sanitizeNumber(totalRevenue, 0)
    const finalTotalOrders = sanitizeNumber(totalOrders, 0)
    const avgTicket = finalTotalOrders > 0 && isValidNumber(finalTotalRevenue / finalTotalOrders)
        ? sanitizeNumber(finalTotalRevenue / finalTotalOrders, 0)
        : 0

    return {
        total_revenue: finalTotalRevenue,
        total_orders: finalTotalOrders,
        average_ticket: avgTicket,
        by_targeting: byTargeting.sort((a, b) => b.total_revenue - a.total_revenue),
        cached: results.cached,
    }
}

export async function getVoucherAnalysis(startDate?: string, endDate?: string) {
    const campaigns = await loadCampaigns()
    const filteredCampaigns = filterByDateRange(campaigns.data, startDate, endDate)

    let withVoucher = 0
    let withoutVoucher = 0
    const voucherTypes: Record<string, number> = {}
    const discountRanges = {
        low: 0,
        medium: 0,
        high: 0,
    }

    for (const campaign of filteredCampaigns) {
        if (campaign.use_voucher && campaign.voucher) {
            withVoucher++

            const voucherType = campaign.voucher.type || 'unknown'
            voucherTypes[voucherType] = (voucherTypes[voucherType] || 0) + 1

            if (voucherType === 'percentage') {
                const discount = campaign.voucher.percentageDiscount || 0
                if (discount < 10) {
                    discountRanges.low++
                } else if (discount < 20) {
                    discountRanges.medium++
                } else {
                    discountRanges.high++
                }
            }
        } else {
            withoutVoucher++
        }
    }

    return {
        with_voucher: withVoucher,
        without_voucher: withoutVoucher,
        voucher_percentage: filteredCampaigns.length > 0
            ? (withVoucher / filteredCampaigns.length) * 100
            : 0,
        voucher_types: Object.entries(voucherTypes).map(([type, count]) => ({
            type,
            count,
            percentage: withVoucher > 0 ? (count / withVoucher) * 100 : 0,
        })),
        discount_ranges: [
            { range: '0-10%', count: discountRanges.low },
            { range: '10-20%', count: discountRanges.medium },
            { range: '20%+', count: discountRanges.high },
        ],
        cached: campaigns.cached,
    }
}

export async function getCampaignStatusDistribution(startDate?: string, endDate?: string) {
    const [campaigns, custom] = await Promise.all([
        loadCampaigns(),
        loadCustom(),
    ])

    const filteredCampaigns = filterByDateRange(campaigns.data, startDate, endDate)
    const filteredCustom = filterByDateRange(custom.data, startDate, endDate)

    const regularStatus: Record<string, number> = {}
    const customStatus: Record<string, number> = {}

    for (const campaign of filteredCampaigns) {
        const status = campaign.status || 'unknown'
        regularStatus[status] = (regularStatus[status] || 0) + 1
    }

    for (const campaign of filteredCustom) {
        const status = campaign.status || 'unknown'
        customStatus[status] = (customStatus[status] || 0) + 1
    }

    return {
        regular_campaigns: Object.entries(regularStatus).map(([status, count]) => ({
            status,
            count,
            percentage: filteredCampaigns.length > 0
                ? (count / filteredCampaigns.length) * 100
                : 0,
        })),
        custom_campaigns: Object.entries(customStatus).map(([status, count]) => ({
            status,
            count,
            percentage: filteredCustom.length > 0
                ? (count / filteredCustom.length) * 100
                : 0,
        })),
        cached: campaigns.cached && custom.cached,
    }
}

export async function getCustomCampaignsAnalysis(startDate?: string, endDate?: string) {
    const custom = await loadCustom()
    const filteredCustom = filterByDateRange(custom.data, startDate, endDate)

    const byTargeting: Record<string, number> = {}
    const byRiskLevel: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    let withMedia = 0
    let withVoucher = 0

    for (const campaign of filteredCustom) {
        const targeting = campaign.targeting || 'unknown'
        const riskLevel = campaign.riskLevel || 'unknown'
        const status = campaign.status || 'unknown'

        byTargeting[targeting] = (byTargeting[targeting] || 0) + 1
        byRiskLevel[riskLevel] = (byRiskLevel[riskLevel] || 0) + 1
        byStatus[status] = (byStatus[status] || 0) + 1

        if (campaign.media) withMedia++
        if (campaign.voucher) withVoucher++
    }

    return {
        total: filteredCustom.length,
        by_targeting: Object.entries(byTargeting).map(([targeting, count]) => ({
            targeting,
            count,
            percentage: filteredCustom.length > 0 ? (count / filteredCustom.length) * 100 : 0,
        })).sort((a, b) => b.count - a.count),
        by_risk_level: Object.entries(byRiskLevel).map(([level, count]) => ({
            level,
            count,
            percentage: filteredCustom.length > 0 ? (count / filteredCustom.length) * 100 : 0,
        })),
        by_status: Object.entries(byStatus).map(([status, count]) => ({
            status,
            count,
            percentage: filteredCustom.length > 0 ? (count / filteredCustom.length) * 100 : 0,
        })),
        with_media: withMedia,
        with_voucher: withVoucher,
        media_percentage: filteredCustom.length > 0 ? (withMedia / filteredCustom.length) * 100 : 0,
        cached: custom.cached,
    }
}

export async function getTopPerformingCampaigns(startDate?: string, endDate?: string) {
    const results = await loadResults()
    const filteredResults = filterByDateRange(results.data, startDate, endDate)

    const campaignsWithMetrics = filteredResults
        .filter(r => r.send_status && r.send_status.totalCount && r.send_status.totalCount > 0)
        .map(r => {
            const sendStatus = r.send_status!
            const totalCount = sanitizeNumber(sendStatus.totalCount, 0)
            const successCount = sanitizeNumber(sendStatus.successCount, 0)
            const successRate = totalCount > 0 && isValidNumber(totalCount)
                ? Math.min(100, Math.max(0, (successCount / totalCount) * 100))
                : 0
            const revenue = sanitizeNumber(r.total_order_value, 0)
            const orders = sanitizeNumber(r.orders_delivered, 0)
            const conversionRate = r.conversion_rate !== null && r.conversion_rate !== undefined
                ? sanitizeNumber(r.conversion_rate, 0)
                : null

            return {
                campaign_id: r.campaign_id || 'unknown',
                targeting: r.targeting || 'unknown',
                success_rate: sanitizeNumber(successRate, 0),
                total_sent: totalCount,
                revenue: isValidNumber(revenue) ? revenue : 0,
                orders: isValidNumber(orders) ? orders : 0,
                conversion_rate: conversionRate !== null && isValidNumber(conversionRate) ? conversionRate : null,
            }
        })
        .filter(c => isValidNumber(c.success_rate) && isValidNumber(c.total_sent))

    const topBySuccess = [...campaignsWithMetrics]
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 10)

    const topByRevenue = [...campaignsWithMetrics]
        .filter(c => isValidNumber(c.revenue) && c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    const topByConversion = [...campaignsWithMetrics]
        .filter(c => c.conversion_rate !== null && isValidNumber(c.conversion_rate!))
        .sort((a, b) => (b.conversion_rate || 0) - (a.conversion_rate || 0))
        .slice(0, 10)

    return {
        top_by_success_rate: topBySuccess,
        top_by_revenue: topByRevenue,
        top_by_conversion: topByConversion,
        cached: results.cached,
    }
}

