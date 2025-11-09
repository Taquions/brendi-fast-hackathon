import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface Campaign {
    id?: string
    campaign_id?: string
    store_id?: string
    status?: string
    targeting?: string
    type?: string
    use_voucher?: boolean
    voucher?: any
    created_at?: {
        iso?: string
        [key: string]: any
    }
    updated_at?: {
        iso?: string
        [key: string]: any
    }
    [key: string]: any
}

interface CampaignResult {
    id?: string
    campaign_id?: string
    store_id?: string
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
    createdAt?: {
        iso?: string
        [key: string]: any
    }
    date?: string
    [key: string]: any
}

interface CampaignInsights {
    summary: {
        total_campaigns: number
        total_results: number
        total_custom_campaigns: number
        date_range: {
            earliest: string | null
            latest: string | null
        }
    }
    campaigns: {
        by_status: Record<string, number>
        by_targeting: Record<string, number>
        by_type: Record<string, number>
        with_voucher: number
        without_voucher: number
        voucher_types: {
            percentage: number
            fixed: number
            other: number
        }
    }
    results: {
        total_sent: number
        total_success: number
        total_errors: number
        success_rate: number
        by_targeting: Record<string, {
            total: number
            success: number
            error: number
            success_rate: number
        }>
        with_conversion_data: number
        average_conversion_rate: number | null
        total_order_value: number
        total_orders_delivered: number
    }
    custom_campaigns: {
        by_status: Record<string, number>
        by_targeting: Record<string, number>
        by_risk_level: Record<string, number>
        with_media: number
        without_media: number
        media_types: Record<string, number>
        with_voucher: number
    }
    performance: {
        top_targeting_by_success: Array<{
            targeting: string
            success_rate: number
            total_sent: number
        }>
        campaigns_with_best_conversion: Array<{
            campaign_id: string
            targeting: string
            conversion_rate: number
            total_order_value: number
        }>
    }
}

function parseDate(dateStr: string | { iso?: string } | null | undefined): Date | null {
    if (!dateStr) return null
    if (typeof dateStr === 'string') {
        const parsed = new Date(dateStr)
        return isNaN(parsed.getTime()) ? null : parsed
    }
    if (dateStr && typeof dateStr === 'object' && 'iso' in dateStr) {
        const parsed = new Date(dateStr.iso || '')
        return isNaN(parsed.getTime()) ? null : parsed
    }
    return null
}

function extractDate(createdAt: any): string | null {
    const date = parseDate(createdAt)
    return date ? date.toISOString() : null
}

async function extractCampaignsInsights() {
    const campaignsPath = resolve(__dirname, '../data/campaigns.json')
    const resultsPath = resolve(__dirname, '../data/campaigns_results.json')
    const customPath = resolve(__dirname, '../data/custom-campaigns.json')
    const outputPath = resolve(__dirname, '../data/campaigns_insights.json')

    console.log('📖 Reading campaigns data...')
    console.log('  - campaigns.json')
    console.log('  - campaigns_results.json')
    console.log('  - custom-campaigns.json')
    console.log('📝 Writing insights to:', outputPath)
    console.log('')

    const campaigns: Campaign[] = JSON.parse(readFileSync(campaignsPath, 'utf8'))
    const results: CampaignResult[] = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const customCampaigns: CustomCampaign[] = JSON.parse(readFileSync(customPath, 'utf8'))

    console.log(`✅ Loaded ${campaigns.length.toLocaleString()} campaigns`)
    console.log(`✅ Loaded ${results.length.toLocaleString()} campaign results`)
    console.log(`✅ Loaded ${customCampaigns.length.toLocaleString()} custom campaigns`)
    console.log('')

    const insights: CampaignInsights = {
        summary: {
            total_campaigns: campaigns.length,
            total_results: results.length,
            total_custom_campaigns: customCampaigns.length,
            date_range: {
                earliest: null,
                latest: null,
            },
        },
        campaigns: {
            by_status: {},
            by_targeting: {},
            by_type: {},
            with_voucher: 0,
            without_voucher: 0,
            voucher_types: {
                percentage: 0,
                fixed: 0,
                other: 0,
            },
        },
        results: {
            total_sent: 0,
            total_success: 0,
            total_errors: 0,
            success_rate: 0,
            by_targeting: {},
            with_conversion_data: 0,
            average_conversion_rate: null,
            total_order_value: 0,
            total_orders_delivered: 0,
        },
        custom_campaigns: {
            by_status: {},
            by_targeting: {},
            by_risk_level: {},
            with_media: 0,
            without_media: 0,
            media_types: {},
            with_voucher: 0,
        },
        performance: {
            top_targeting_by_success: [],
            campaigns_with_best_conversion: [],
        },
    }

    const allDates: Date[] = []

    console.log('📊 Analyzing campaigns...')
    for (const campaign of campaigns) {
        const status = campaign.status || 'unknown'
        const targeting = campaign.targeting || 'unknown'
        const type = campaign.type || 'unknown'

        insights.campaigns.by_status[status] = (insights.campaigns.by_status[status] || 0) + 1
        insights.campaigns.by_targeting[targeting] = (insights.campaigns.by_targeting[targeting] || 0) + 1
        insights.campaigns.by_type[type] = (insights.campaigns.by_type[type] || 0) + 1

        if (campaign.use_voucher && campaign.voucher) {
            insights.campaigns.with_voucher++
            const voucherType = campaign.voucher.type || 'other'
            if (voucherType === 'percentage') {
                insights.campaigns.voucher_types.percentage++
            } else if (voucherType === 'fixed') {
                insights.campaigns.voucher_types.fixed++
            } else {
                insights.campaigns.voucher_types.other++
            }
        } else {
            insights.campaigns.without_voucher++
        }

        const date = parseDate(campaign.created_at)
        if (date) allDates.push(date)
    }

    console.log('📊 Analyzing campaign results...')
    const conversionRates: number[] = []
    const targetingStats: Record<string, { total: number; success: number; error: number }> = {}

    for (const result of results) {
        const sendStatus = result.send_status
        if (sendStatus) {
            const total = sendStatus.totalCount || 0
            const success = sendStatus.successCount || 0
            const error = sendStatus.errorCount || 0

            insights.results.total_sent += total
            insights.results.total_success += success
            insights.results.total_errors += error

            const targeting = result.targeting || 'unknown'
            if (!targetingStats[targeting]) {
                targetingStats[targeting] = { total: 0, success: 0, error: 0 }
            }
            targetingStats[targeting].total += total
            targetingStats[targeting].success += success
            targetingStats[targeting].error += error
        }

        if (result.conversion_rate !== null && result.conversion_rate !== undefined) {
            insights.results.with_conversion_data++
            conversionRates.push(result.conversion_rate)
        }

        if (result.total_order_value !== null && result.total_order_value !== undefined) {
            insights.results.total_order_value += result.total_order_value
        }

        if (result.orders_delivered !== null && result.orders_delivered !== undefined) {
            insights.results.total_orders_delivered += result.orders_delivered
        }

        const date = parseDate(result.timestamp || result.created_at)
        if (date) allDates.push(date)
    }

    for (const [targeting, stats] of Object.entries(targetingStats)) {
        insights.results.by_targeting[targeting] = {
            total: stats.total,
            success: stats.success,
            error: stats.error,
            success_rate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
        }
    }

    insights.results.success_rate =
        insights.results.total_sent > 0
            ? (insights.results.total_success / insights.results.total_sent) * 100
            : 0

    insights.results.average_conversion_rate =
        conversionRates.length > 0
            ? conversionRates.reduce((sum, rate) => sum + rate, 0) / conversionRates.length
            : null

    console.log('📊 Analyzing custom campaigns...')
    for (const custom of customCampaigns) {
        const status = custom.status || 'unknown'
        const targeting = custom.targeting || 'unknown'
        const riskLevel = custom.riskLevel || 'unknown'

        insights.custom_campaigns.by_status[status] =
            (insights.custom_campaigns.by_status[status] || 0) + 1
        insights.custom_campaigns.by_targeting[targeting] =
            (insights.custom_campaigns.by_targeting[targeting] || 0) + 1
        insights.custom_campaigns.by_risk_level[riskLevel] =
            (insights.custom_campaigns.by_risk_level[riskLevel] || 0) + 1

        if (custom.media) {
            insights.custom_campaigns.with_media++
            const mediaType = custom.media.type || 'unknown'
            insights.custom_campaigns.media_types[mediaType] =
                (insights.custom_campaigns.media_types[mediaType] || 0) + 1
        } else {
            insights.custom_campaigns.without_media++
        }

        if (custom.voucher) {
            insights.custom_campaigns.with_voucher++
        }

        const date = parseDate(custom.createdAt || custom.date)
        if (date) allDates.push(date)
    }

    if (allDates.length > 0) {
        allDates.sort((a, b) => a.getTime() - b.getTime())
        insights.summary.date_range.earliest = allDates[0].toISOString()
        insights.summary.date_range.latest = allDates[allDates.length - 1].toISOString()
    }

    console.log('📊 Calculating performance metrics...')
    insights.performance.top_targeting_by_success = Object.entries(insights.results.by_targeting)
        .map(([targeting, stats]) => ({
            targeting,
            success_rate: stats.success_rate,
            total_sent: stats.total,
        }))
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 10)

    const campaignsWithConversion = results
        .filter((r) => r.conversion_rate !== null && r.conversion_rate !== undefined)
        .map((r) => ({
            campaign_id: r.campaign_id || 'unknown',
            targeting: r.targeting || 'unknown',
            conversion_rate: r.conversion_rate!,
            total_order_value: r.total_order_value || 0,
        }))
        .sort((a, b) => b.conversion_rate - a.conversion_rate)
        .slice(0, 10)

    insights.performance.campaigns_with_best_conversion = campaignsWithConversion

    console.log('💾 Writing insights to file...')
    writeFileSync(outputPath, JSON.stringify(insights, null, 2), 'utf8')

    console.log('')
    console.log('🎉 Complete! Campaign insights extracted')
    console.log(`📁 Output file: data/campaigns_insights.json`)
    console.log('')
    console.log('📈 Key Insights:')
    console.log(`  - Total campaigns: ${insights.summary.total_campaigns.toLocaleString()}`)
    console.log(`  - Campaign results: ${insights.summary.total_results.toLocaleString()}`)
    console.log(`  - Custom campaigns: ${insights.summary.total_custom_campaigns.toLocaleString()}`)
    console.log(`  - Success rate: ${insights.results.success_rate.toFixed(2)}%`)
    console.log(
        `  - Average conversion rate: ${
            insights.results.average_conversion_rate
                ? insights.results.average_conversion_rate.toFixed(2) + '%'
                : 'N/A'
        }`
    )
    console.log(`  - Total messages sent: ${insights.results.total_sent.toLocaleString()}`)
    console.log(`  - Total order value: R$ ${insights.results.total_order_value.toLocaleString()}`)
}

extractCampaignsInsights().catch(console.error)

