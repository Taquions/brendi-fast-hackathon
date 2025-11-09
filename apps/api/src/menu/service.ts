import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'

function getMenuEventsFilePath(): string {
    const cwd = process.cwd()

    const pathsToTry = [
        resolve(cwd, 'data/menu_events_last_30_days.json'),
        resolve(cwd, '../../data/menu_events_last_30_days.json'),
    ]

    for (const path of pathsToTry) {
        if (existsSync(path)) {
            return path
        }
    }

    return resolve(cwd, 'data/menu_events_last_30_days.json')
}

const MENU_EVENTS_FILE_PATH = getMenuEventsFilePath()
const CACHE_TTL = 5 * 60 * 1000

interface MenuEvent {
    id: string
    created_at: string
    event_type: 'pageView' | 'productView' | 'addToCart' | 'checkoutStart' | 'purchase'
    device_type: 'mobile' | 'desktop'
    platform: 'android' | 'ios' | 'web'
    referrer: string
    session_id: string
    store_id: string
    metadata: string
    timestamp: string
}

interface EventMetadata {
    price?: number
    quantity?: number
    product_id?: string
    product_name?: string
    cart_total?: number
    item_count?: number
    total?: number
    order_id?: string
}

interface ConversionFunnel {
    pageViews: number
    productViews: number
    addToCart: number
    checkoutStart: number
    purchases: number
}

interface ConversionRates {
    productViewToAddToCart: number
    addToCartToCheckout: number
    checkoutToPurchase: number
    overallConversion: number
}

interface ProductPerformance {
    product_id: string
    product_name: string
    views: number
    addToCartCount: number
    purchaseCount: number
    viewToCartRate: number
    cartToPurchaseRate: number
    totalRevenue: number
}

interface ReferrerPerformance {
    referrer: string
    sessions: number
    pageViews: number
    purchases: number
    conversionRate: number
    revenue: number
    averageOrderValue: number
}

interface PeakHour {
    hour: string
    eventCount: number
    purchases: number
    conversionRate: number
}

interface SessionMetrics {
    totalSessions: number
    sessionsWithPurchase: number
    sessionConversionRate: number
    averageEventsPerSession: number
    averageSessionDuration: number
}

interface AbandonmentAnalysis {
    cartAbandonments: number
    checkoutAbandonments: number
    cartAbandonmentRate: number
    checkoutAbandonmentRate: number
    averageAbandonedCartValue: number
}

export interface MenuEventsInsights {
    totalEvents: number
    dateRange: {
        start: string
        end: string
    }
    conversionFunnel: ConversionFunnel
    conversionRates: ConversionRates
    topProducts: ProductPerformance[]
    referrerPerformance: ReferrerPerformance[]
    peakHours: PeakHour[]
    deviceDistribution: {
        device: string
        count: number
        percentage: number
    }[]
    platformDistribution: {
        platform: string
        count: number
        percentage: number
    }[]
    sessionMetrics: SessionMetrics
    abandonmentAnalysis: AbandonmentAnalysis
    averageCartValue: number
    averageOrderValue: number
    cached?: boolean
}

let cachedInsights: MenuEventsInsights | null = null
let lastCacheTime: number = 0
let lastFileMtimeMs: number | null = null
let lastFileSize: number | null = null

function parseMetadata(metadataStr: string): EventMetadata {
    try {
        return JSON.parse(metadataStr)
    } catch {
        return {}
    }
}

function extractHour(timestamp: string): string {
    const match = timestamp.match(/(\d{1,2}):\d{2}/)
    return match ? match[1].padStart(2, '0') : 'unknown'
}

function parseTimestamp(timestamp: string): Date {
    const match = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}), (\d{1,2}):(\d{2})/)
    if (!match) return new Date()

    const [, day, month, year, hour, minute] = match
    return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
    )
}

async function calculateInsights(events: MenuEvent[]): Promise<MenuEventsInsights> {
    const eventsByType = new Map<string, number>()
    const eventsByDevice = new Map<string, number>()
    const eventsByPlatform = new Map<string, number>()
    const productStats = new Map<string, {
        product_id: string
        product_name: string
        views: number
        addToCart: number
        purchases: number
        revenue: number
    }>()
    const hourCounts = new Map<string, { events: number; purchases: number }>()
    const sessions = new Map<string, {
        events: MenuEvent[]
        hasPurchase: boolean
        totalRevenue: number
        cartTotal: number
        hasCheckout: boolean
        firstEventTime?: Date
        lastEventTime?: Date
    }>()
    const referrerStats = new Map<string, {
        sessions: Set<string>
        pageViews: number
        purchases: number
        revenue: number
    }>()

    let totalCartValue = 0
    let cartCount = 0
    let totalOrderValue = 0
    let orderCount = 0
    let cartAbandonments = 0
    let checkoutAbandonments = 0
    let totalAbandonedCartValue = 0
    let abandonedCartCount = 0

    let earliestDate: Date | null = null
    let latestDate: Date | null = null

    for (const event of events) {
        const eventDate = parseTimestamp(event.timestamp)
        if (!earliestDate || eventDate < earliestDate) earliestDate = eventDate
        if (!latestDate || eventDate > latestDate) latestDate = eventDate

        eventsByType.set(event.event_type, (eventsByType.get(event.event_type) || 0) + 1)
        eventsByDevice.set(event.device_type, (eventsByDevice.get(event.device_type) || 0) + 1)
        eventsByPlatform.set(event.platform, (eventsByPlatform.get(event.platform) || 0) + 1)

        const hour = extractHour(event.timestamp)
        const hourData = hourCounts.get(hour) || { events: 0, purchases: 0 }
        hourData.events++
        if (event.event_type === 'purchase') hourData.purchases++
        hourCounts.set(hour, hourData)

        if (!sessions.has(event.session_id)) {
            sessions.set(event.session_id, {
                events: [],
                hasPurchase: false,
                totalRevenue: 0,
                cartTotal: 0,
                hasCheckout: false,
                firstEventTime: eventDate,
                lastEventTime: eventDate,
            })
        }

        const session = sessions.get(event.session_id)!
        session.events.push(event)
        session.lastEventTime = eventDate

        const referrer = event.referrer || 'Direct'
        if (!referrerStats.has(referrer)) {
            referrerStats.set(referrer, {
                sessions: new Set(),
                pageViews: 0,
                purchases: 0,
                revenue: 0,
            })
        }
        const refStats = referrerStats.get(referrer)!
        refStats.sessions.add(event.session_id)
        if (event.event_type === 'pageView') refStats.pageViews++

        const metadata = parseMetadata(event.metadata)

        if (event.event_type === 'productView' && metadata.product_id) {
            if (!productStats.has(metadata.product_id)) {
                productStats.set(metadata.product_id, {
                    product_id: metadata.product_id,
                    product_name: metadata.product_name || 'Unknown',
                    views: 0,
                    addToCart: 0,
                    purchases: 0,
                    revenue: 0,
                })
            }
            productStats.get(metadata.product_id)!.views++
        }

        if (event.event_type === 'addToCart' && metadata.product_id) {
            if (!productStats.has(metadata.product_id)) {
                productStats.set(metadata.product_id, {
                    product_id: metadata.product_id,
                    product_name: metadata.product_name || 'Unknown',
                    views: 0,
                    addToCart: 0,
                    purchases: 0,
                    revenue: 0,
                })
            }
            productStats.get(metadata.product_id)!.addToCart++

            if (metadata.price) {
                const itemTotal = metadata.price * (metadata.quantity || 1)
                totalCartValue += itemTotal
                cartCount++
            }
        }

        if (event.event_type === 'checkoutStart') {
            session.hasCheckout = true
            if (metadata.cart_total) {
                session.cartTotal = metadata.cart_total
            }
        }

        if (event.event_type === 'purchase') {
            session.hasPurchase = true
            refStats.purchases++

            if (metadata.total) {
                session.totalRevenue += metadata.total
                refStats.revenue += metadata.total
                totalOrderValue += metadata.total
                orderCount++
            }
        }
    }

    for (const session of sessions.values()) {
        const hasAddToCart = session.events.some(e => e.event_type === 'addToCart')
        const hasCheckout = session.hasCheckout
        const hasPurchase = session.hasPurchase

        if (hasAddToCart && !hasCheckout) {
            cartAbandonments++
            if (session.cartTotal > 0) {
                totalAbandonedCartValue += session.cartTotal
                abandonedCartCount++
            }
        }

        if (hasCheckout && !hasPurchase) {
            checkoutAbandonments++
        }
    }

    const conversionFunnel: ConversionFunnel = {
        pageViews: eventsByType.get('pageView') || 0,
        productViews: eventsByType.get('productView') || 0,
        addToCart: eventsByType.get('addToCart') || 0,
        checkoutStart: eventsByType.get('checkoutStart') || 0,
        purchases: eventsByType.get('purchase') || 0,
    }

    const conversionRates: ConversionRates = {
        productViewToAddToCart: conversionFunnel.productViews > 0
            ? (conversionFunnel.addToCart / conversionFunnel.productViews) * 100
            : 0,
        addToCartToCheckout: conversionFunnel.addToCart > 0
            ? (conversionFunnel.checkoutStart / conversionFunnel.addToCart) * 100
            : 0,
        checkoutToPurchase: conversionFunnel.checkoutStart > 0
            ? (conversionFunnel.purchases / conversionFunnel.checkoutStart) * 100
            : 0,
        overallConversion: conversionFunnel.pageViews > 0
            ? (conversionFunnel.purchases / conversionFunnel.pageViews) * 100
            : 0,
    }

    const topProducts: ProductPerformance[] = Array.from(productStats.values())
        .map(p => ({
            product_id: p.product_id,
            product_name: p.product_name,
            views: p.views,
            addToCartCount: p.addToCart,
            purchaseCount: p.purchases,
            viewToCartRate: p.views > 0 ? (p.addToCart / p.views) * 100 : 0,
            cartToPurchaseRate: p.addToCart > 0 ? (p.purchases / p.addToCart) * 100 : 0,
            totalRevenue: p.revenue,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 20)

    const referrerPerformance: ReferrerPerformance[] = Array.from(referrerStats.entries())
        .map(([referrer, stats]) => ({
            referrer,
            sessions: stats.sessions.size,
            pageViews: stats.pageViews,
            purchases: stats.purchases,
            conversionRate: stats.sessions.size > 0
                ? (stats.purchases / stats.sessions.size) * 100
                : 0,
            revenue: stats.revenue,
            averageOrderValue: stats.purchases > 0 ? stats.revenue / stats.purchases : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    const peakHours: PeakHour[] = Array.from(hourCounts.entries())
        .map(([hour, data]) => ({
            hour: `${hour}:00`,
            eventCount: data.events,
            purchases: data.purchases,
            conversionRate: data.events > 0 ? (data.purchases / data.events) * 100 : 0,
        }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10)

    const deviceDistribution = Array.from(eventsByDevice.entries())
        .map(([device, count]) => ({
            device,
            count,
            percentage: (count / events.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)

    const platformDistribution = Array.from(eventsByPlatform.entries())
        .map(([platform, count]) => ({
            platform,
            count,
            percentage: (count / events.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)

    const sessionsWithPurchase = Array.from(sessions.values()).filter(s => s.hasPurchase).length
    const totalSessionEvents = Array.from(sessions.values()).reduce((sum, s) => sum + s.events.length, 0)

    const sessionDurations: number[] = []
    for (const session of sessions.values()) {
        if (session.firstEventTime && session.lastEventTime) {
            const duration = (session.lastEventTime.getTime() - session.firstEventTime.getTime()) / 1000 / 60
            if (duration >= 0 && duration < 1440) {
                sessionDurations.push(duration)
            }
        }
    }

    const sessionMetrics: SessionMetrics = {
        totalSessions: sessions.size,
        sessionsWithPurchase,
        sessionConversionRate: sessions.size > 0 ? (sessionsWithPurchase / sessions.size) * 100 : 0,
        averageEventsPerSession: sessions.size > 0 ? totalSessionEvents / sessions.size : 0,
        averageSessionDuration: sessionDurations.length > 0
            ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length
            : 0,
    }

    const abandonmentAnalysis: AbandonmentAnalysis = {
        cartAbandonments,
        checkoutAbandonments,
        cartAbandonmentRate: conversionFunnel.addToCart > 0
            ? (cartAbandonments / conversionFunnel.addToCart) * 100
            : 0,
        checkoutAbandonmentRate: conversionFunnel.checkoutStart > 0
            ? (checkoutAbandonments / conversionFunnel.checkoutStart) * 100
            : 0,
        averageAbandonedCartValue: abandonedCartCount > 0
            ? totalAbandonedCartValue / abandonedCartCount
            : 0,
    }

    return {
        totalEvents: events.length,
        dateRange: {
            start: earliestDate?.toISOString() || '',
            end: latestDate?.toISOString() || '',
        },
        conversionFunnel,
        conversionRates,
        topProducts,
        referrerPerformance,
        peakHours,
        deviceDistribution,
        platformDistribution,
        sessionMetrics,
        abandonmentAnalysis,
        averageCartValue: cartCount > 0 ? totalCartValue / cartCount : 0,
        averageOrderValue: orderCount > 0 ? totalOrderValue / orderCount : 0,
    }
}

export async function getMenuEventsInsights(startDate?: string, endDate?: string): Promise<MenuEventsInsights> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedInsights === null || (now - lastCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(MENU_EVENTS_FILE_PATH)
            const hasFileChanged =
                (lastFileMtimeMs !== null && stats.mtimeMs !== lastFileMtimeMs) ||
                (lastFileSize !== null && stats.size !== lastFileSize)

            if (hasFileChanged) {
                cachedInsights = null
            }
            lastFileMtimeMs = stats.mtimeMs
            lastFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedInsights !== null && (now - lastCacheTime) < CACHE_TTL) {
            return {
                ...cachedInsights,
                cached: true,
            }
        }

        const fileContent = await readFile(MENU_EVENTS_FILE_PATH, 'utf8')
        let events: MenuEvent[] = JSON.parse(fileContent)

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null
            const end = endDate ? new Date(endDate) : null

            events = events.filter(event => {
                const eventDate = parseTimestamp(event.timestamp)
                if (start && eventDate < start) {
                    return false
                }
                if (end && eventDate > end) {
                    return false
                }
                return true
            })
        }

        const insights = await calculateInsights(events)
        if (!startDate && !endDate) {
            cachedInsights = insights
            lastCacheTime = now
        }

        return {
            ...insights,
            cached: false,
        }
    }

    return {
        ...cachedInsights,
        cached: true,
    }
}

