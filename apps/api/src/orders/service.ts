import { createReadStream, existsSync, statSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { resolve } from 'path'
import { Transform } from 'stream'

function getOrdersFilePath(): string {
    const cwd = process.cwd()

    const pathsToTry = [
        resolve(cwd, 'data/orders_summary.json'),
        resolve(cwd, '../../data/orders_summary.json'),
    ]

    for (const path of pathsToTry) {
        if (existsSync(path)) {
            return path
        }
    }

    return resolve(cwd, 'data/orders_summary.json')
}

const ORDERS_FILE_PATH = getOrdersFilePath()

interface OrdersCountResult {
    total: number
    cached?: boolean
}

let cachedCount: number | null = null
let lastCacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let lastCountFileMtimeMs: number | null = null
let lastCountFileSize: number | null = null

export async function getTotalOrdersCount(startDate?: string, endDate?: string): Promise<OrdersCountResult> {
    const now = Date.now()

    // Invalidate cache if file changed (mtime or size)
    try {
        const stats = await stat(ORDERS_FILE_PATH)
        const hasFileChanged =
            (lastCountFileMtimeMs !== null && stats.mtimeMs !== lastCountFileMtimeMs) ||
            (lastCountFileSize !== null && stats.size !== lastCountFileSize)

        if (hasFileChanged) {
            cachedCount = null
        }
        lastCountFileMtimeMs = stats.mtimeMs
        lastCountFileSize = stats.size
    } catch {
        // If stat fails, fall through to cache TTL check
    }

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedCount === null || (now - lastCacheTime) >= CACHE_TTL) {
        const count = await countOrdersFromFile(startDate, endDate)
        if (!startDate && !endDate) {
            cachedCount = count
            lastCacheTime = now
        }
        return {
            total: count,
            cached: false,
        }
    }

    return {
        total: cachedCount,
        cached: true,
    }
}

async function countOrdersFromFile(startDate?: string, endDate?: string): Promise<number> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const parsed = JSON.parse(fileContent) as Array<{ createdAt?: { iso?: string } }>
    if (!Array.isArray(parsed)) {
        return 0
    }

    if (!startDate && !endDate) {
        return parsed.length
    }

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    return parsed.filter((order) => {
        if (!order.createdAt?.iso) {
            return false
        }
        const createdAt = new Date(order.createdAt.iso)
        if (start && createdAt < start) {
            return false
        }
        if (end && createdAt > end) {
            return false
        }
        return true
    }).length
}

interface RevenueResult {
    amountInCents: number
    cached?: boolean
}

let cachedRevenue: number | null = null
let lastRevenueCacheTime: number = 0

export async function getTotalRevenueAmount(startDate?: string, endDate?: string): Promise<RevenueResult> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedRevenue === null || (now - lastRevenueCacheTime) >= CACHE_TTL) {
        const amount = await sumRevenueFromFile(startDate, endDate)
        if (!startDate && !endDate) {
            cachedRevenue = amount
            lastRevenueCacheTime = now
        }
        return {
            amountInCents: amount,
            cached: false,
        }
    }

    return {
        amountInCents: cachedRevenue,
        cached: true,
    }
}

async function sumRevenueFromFile(startDate?: string, endDate?: string): Promise<number> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const parsed = JSON.parse(fileContent) as Array<{ totalPrice?: number; createdAt?: { iso?: string } }>
    let sum = 0

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    for (const item of parsed) {
        if (startDate || endDate) {
            if (!item.createdAt?.iso) {
                continue
            }
            const createdAt = new Date(item.createdAt.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }

        if (typeof item.totalPrice === 'number' && Number.isFinite(item.totalPrice)) {
            sum += item.totalPrice
        }
    }
    return sum
}

export interface ProductStats {
    name: string
    occurrences: number
    totalQuantity: number
}

interface MostOrderedProductsResult {
    products: ProductStats[]
    cached?: boolean
}

let cachedMostOrderedProducts: ProductStats[] | null = null
let lastMostOrderedProductsCacheTime: number = 0
let lastMostOrderedProductsFileMtimeMs: number | null = null
let lastMostOrderedProductsFileSize: number | null = null

export async function getMostOrderedProducts(startDate?: string, endDate?: string): Promise<MostOrderedProductsResult> {
    const now = Date.now()

    try {
        const stats = await stat(ORDERS_FILE_PATH)
        const hasFileChanged =
            (lastMostOrderedProductsFileMtimeMs !== null && stats.mtimeMs !== lastMostOrderedProductsFileMtimeMs) ||
            (lastMostOrderedProductsFileSize !== null && stats.size !== lastMostOrderedProductsFileSize)

        if (hasFileChanged) {
            cachedMostOrderedProducts = null
        }
        lastMostOrderedProductsFileMtimeMs = stats.mtimeMs
        lastMostOrderedProductsFileSize = stats.size
    } catch {
        // If stat fails, fall through to cache TTL check
    }

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedMostOrderedProducts === null || (now - lastMostOrderedProductsCacheTime) >= CACHE_TTL) {
        const products = await calculateMostOrderedProducts(startDate, endDate)
        if (!startDate && !endDate) {
            cachedMostOrderedProducts = products
            lastMostOrderedProductsCacheTime = now
        }
        return {
            products,
            cached: false,
        }
    }

    return {
        products: cachedMostOrderedProducts,
        cached: true,
    }
}

function normalizeProductName(name: string): string {
    return name
        .trim()
        .replace(/^\*+\s*/, '')
        .replace(/\s*\*+$/, '')
        .replace(/\.+$/, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim()
}

async function calculateMostOrderedProducts(startDate?: string, endDate?: string): Promise<ProductStats[]> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const orders = JSON.parse(fileContent) as Array<{
        products?: Array<{ name?: string; quantity?: number }>
        createdAt?: { iso?: string }
    }>

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const productMap = new Map<string, {
        occurrences: number
        totalQuantity: number
        originalNames: Map<string, number>
    }>()

    for (const order of orders) {
        if (startDate || endDate) {
            if (!order.createdAt?.iso) {
                continue
            }
            const createdAt = new Date(order.createdAt.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }

        if (!Array.isArray(order.products)) {
            continue
        }

        for (const product of order.products) {
            const productName = product.name
            if (!productName || typeof productName !== 'string') {
                continue
            }

            const quantity = typeof product.quantity === 'number' && Number.isFinite(product.quantity)
                ? product.quantity
                : 0

            const normalizedName = normalizeProductName(productName)
            const existing = productMap.get(normalizedName)

            if (existing) {
                existing.occurrences += 1
                existing.totalQuantity += quantity
                const nameCount = existing.originalNames.get(productName) || 0
                existing.originalNames.set(productName, nameCount + 1)
            } else {
                const originalNamesMap = new Map<string, number>()
                originalNamesMap.set(productName, 1)
                productMap.set(normalizedName, {
                    occurrences: 1,
                    totalQuantity: quantity,
                    originalNames: originalNamesMap,
                })
            }
        }
    }

    const products: ProductStats[] = Array.from(productMap.entries()).map(([normalizedName, stats]) => {
        let mostCommonName = normalizedName
        let maxCount = 0

        for (const [originalName, count] of stats.originalNames.entries()) {
            if (count > maxCount) {
                maxCount = count
                mostCommonName = originalName
            }
        }

        return {
            name: mostCommonName,
            occurrences: stats.occurrences,
            totalQuantity: stats.totalQuantity,
        }
    })

    products.sort((a, b) => {
        if (b.occurrences !== a.occurrences) {
            return b.occurrences - a.occurrences
        }
        return b.totalQuantity - a.totalQuantity
    })

    return products
}

interface Order {
    id: string
    totalPrice: number
    status: string
    payment: {
        type: string
        online: boolean | null
        total: number | null
    }
    delivery: {
        type: string
        maxTime: number
        minTime: number
        price: number
    }
    motoboy: {
        name: string | null
    }
    customer: {
        phone: string
        name: string
    }
    products: Array<{
        name: string
        price: number
        quantity: number
        orderCustoms?: unknown[]
    }>
    createdAt: {
        iso: string
    }
    isScheduled: boolean | null
}

interface OrdersListResult {
    orders: Order[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    cached?: boolean
}

let cachedOrdersList: Order[] | null = null
let lastOrdersListCacheTime: number = 0
let lastOrdersListFileMtimeMs: number | null = null
let lastOrdersListFileSize: number | null = null

export async function getOrdersList(page: number = 1, pageSize: number = 50): Promise<OrdersListResult> {
    const now = Date.now()

    try {
        const stats = await stat(ORDERS_FILE_PATH)
        const hasFileChanged =
            (lastOrdersListFileMtimeMs !== null && stats.mtimeMs !== lastOrdersListFileMtimeMs) ||
            (lastOrdersListFileSize !== null && stats.size !== lastOrdersListFileSize)

        if (hasFileChanged) {
            cachedOrdersList = null
        }
        lastOrdersListFileMtimeMs = stats.mtimeMs
        lastOrdersListFileSize = stats.size
    } catch {
        // If stat fails, fall through to cache TTL check
    }

    if (cachedOrdersList === null || (now - lastOrdersListCacheTime) >= CACHE_TTL) {
        const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
        cachedOrdersList = JSON.parse(fileContent) as Order[]
        lastOrdersListCacheTime = now
    }

    const total = cachedOrdersList.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const orders = cachedOrdersList.slice(startIndex, endIndex)

    return {
        orders,
        total,
        page,
        pageSize,
        totalPages,
        cached: cachedOrdersList !== null && (now - lastOrdersListCacheTime) < CACHE_TTL,
    }
}

interface PaymentTypeStats {
    type: string
    count: number
    percentage: number
}

interface PaymentTypesResult {
    paymentTypes: PaymentTypeStats[]
    total: number
    cached?: boolean
}

let cachedPaymentTypes: PaymentTypeStats[] | null = null
let lastPaymentTypesCacheTime: number = 0
let lastPaymentTypesFileMtimeMs: number | null = null
let lastPaymentTypesFileSize: number | null = null

export async function getPaymentTypesStats(startDate?: string, endDate?: string): Promise<PaymentTypesResult> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedPaymentTypes === null || (now - lastPaymentTypesCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(ORDERS_FILE_PATH)
            const hasFileChanged =
                (lastPaymentTypesFileMtimeMs !== null && stats.mtimeMs !== lastPaymentTypesFileMtimeMs) ||
                (lastPaymentTypesFileSize !== null && stats.size !== lastPaymentTypesFileSize)

            if (hasFileChanged) {
                cachedPaymentTypes = null
            }
            lastPaymentTypesFileMtimeMs = stats.mtimeMs
            lastPaymentTypesFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedPaymentTypes !== null && (now - lastPaymentTypesCacheTime) < CACHE_TTL) {
            return {
                paymentTypes: cachedPaymentTypes,
                total: cachedPaymentTypes.reduce((sum, item) => sum + item.count, 0),
                cached: true,
            }
        }

        const paymentTypes = await calculatePaymentTypesStats(startDate, endDate)
        if (!startDate && !endDate) {
            cachedPaymentTypes = paymentTypes
            lastPaymentTypesCacheTime = now
        }

        return {
            paymentTypes,
            total: paymentTypes.reduce((sum, item) => sum + item.count, 0),
            cached: false,
        }
    }

    return {
        paymentTypes: cachedPaymentTypes,
        total: cachedPaymentTypes.reduce((sum, item) => sum + item.count, 0),
        cached: true,
    }
}

async function calculatePaymentTypesStats(startDate?: string, endDate?: string): Promise<PaymentTypeStats[]> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const orders = JSON.parse(fileContent) as Order[]

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const paymentMap = new Map<string, number>()

    for (const order of orders) {
        if (startDate || endDate) {
            if (!order.createdAt?.iso) {
                continue
            }
            const createdAt = new Date(order.createdAt.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }
        if (!order.payment || !order.payment.type) {
            continue
        }

        const paymentType = order.payment.type.toLowerCase()
        const isOnline = order.payment.online === true

        let category: string

        if (paymentType === 'onlinecredit') {
            category = 'Crédito Online'
        } else if (paymentType === 'pix') {
            category = isOnline ? 'Pix Online' : 'Pix'
        } else if (paymentType === 'credit') {
            category = isOnline ? 'Crédito Online' : 'Crédito'
        } else if (paymentType === 'debit') {
            category = isOnline ? 'Débito Online' : 'Débito'
        } else if (paymentType === 'money') {
            category = 'Dinheiro'
        } else {
            category = paymentType.charAt(0).toUpperCase() + paymentType.slice(1)
        }

        const count = paymentMap.get(category) || 0
        paymentMap.set(category, count + 1)
    }

    const total = Array.from(paymentMap.values()).reduce((sum, count) => sum + count, 0)

    const paymentTypes: PaymentTypeStats[] = Array.from(paymentMap.entries())
        .map(([type, count]) => ({
            type,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

    return paymentTypes
}

interface DeliveryTypeStats {
    type: string
    count: number
    percentage: number
}

interface DeliveryTimeRangeStats {
    range: string
    count: number
    percentage: number
    averageTime: number
}

interface DeliveryPriceRangeStats {
    range: string
    count: number
    percentage: number
    averagePrice: number
}

interface DeliveryStatsResult {
    deliveryTypes: DeliveryTypeStats[]
    timeRanges: DeliveryTimeRangeStats[]
    priceRanges: DeliveryPriceRangeStats[]
    cached?: boolean
}

let cachedDeliveryStats: DeliveryStatsResult | null = null
let lastDeliveryStatsCacheTime: number = 0
let lastDeliveryStatsFileMtimeMs: number | null = null
let lastDeliveryStatsFileSize: number | null = null

export async function getDeliveryStats(startDate?: string, endDate?: string): Promise<DeliveryStatsResult> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedDeliveryStats === null || (now - lastDeliveryStatsCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(ORDERS_FILE_PATH)
            const hasFileChanged =
                (lastDeliveryStatsFileMtimeMs !== null && stats.mtimeMs !== lastDeliveryStatsFileMtimeMs) ||
                (lastDeliveryStatsFileSize !== null && stats.size !== lastDeliveryStatsFileSize)

            if (hasFileChanged) {
                cachedDeliveryStats = null
            }
            lastDeliveryStatsFileMtimeMs = stats.mtimeMs
            lastDeliveryStatsFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedDeliveryStats !== null && (now - lastDeliveryStatsCacheTime) < CACHE_TTL) {
            return {
                ...cachedDeliveryStats,
                cached: true,
            }
        }

        const result = await calculateDeliveryStats(startDate, endDate)
        if (!startDate && !endDate) {
            cachedDeliveryStats = result
            lastDeliveryStatsCacheTime = now
        }

        return {
            ...result,
            cached: false,
        }
    }

    return {
        ...cachedDeliveryStats,
        cached: true,
    }
}

async function calculateDeliveryStats(startDate?: string, endDate?: string): Promise<DeliveryStatsResult> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const orders = JSON.parse(fileContent) as Order[]

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const deliveryTypeMap = new Map<string, number>()
    const timeRangesMap = new Map<string, { count: number; totalTime: number }>()
    const priceRangesMap = new Map<string, { count: number; totalPrice: number }>()

    for (const order of orders) {
        if (startDate || endDate) {
            if (!order.createdAt?.iso) {
                continue
            }
            const createdAt = new Date(order.createdAt.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }
        if (!order.delivery) {
            continue
        }

        const deliveryType = order.delivery.type.toLowerCase()
        let typeLabel: string

        if (deliveryType === 'delivery') {
            typeLabel = 'Entrega'
        } else if (deliveryType === 'pickup' || deliveryType === 'takeout') {
            typeLabel = 'Retirada'
        } else if (deliveryType === 'dine-in' || deliveryType === 'dinein') {
            typeLabel = 'Consumo no Local'
        } else {
            typeLabel = deliveryType.charAt(0).toUpperCase() + deliveryType.slice(1)
        }

        const typeCount = deliveryTypeMap.get(typeLabel) || 0
        deliveryTypeMap.set(typeLabel, typeCount + 1)

        if (order.delivery.minTime !== undefined && order.delivery.maxTime !== undefined) {
            const avgTime = (order.delivery.minTime + order.delivery.maxTime) / 2
            let timeRange: string

            if (avgTime <= 30) {
                timeRange = '0-30 min'
            } else if (avgTime <= 45) {
                timeRange = '30-45 min'
            } else if (avgTime <= 60) {
                timeRange = '45-60 min'
            } else if (avgTime <= 90) {
                timeRange = '60-90 min'
            } else {
                timeRange = '90+ min'
            }

            const rangeData = timeRangesMap.get(timeRange) || { count: 0, totalTime: 0 }
            rangeData.count += 1
            rangeData.totalTime += avgTime
            timeRangesMap.set(timeRange, rangeData)
        }

        if (order.delivery.price !== undefined && order.delivery.price !== null) {
            const price = order.delivery.price
            let priceRange: string

            if (price === 0) {
                priceRange = 'Grátis'
            } else if (price <= 500) {
                priceRange = 'R$ 0 - R$ 5,00'
            } else if (price <= 1000) {
                priceRange = 'R$ 5,01 - R$ 10,00'
            } else if (price <= 1500) {
                priceRange = 'R$ 10,01 - R$ 15,00'
            } else if (price <= 2000) {
                priceRange = 'R$ 15,01 - R$ 20,00'
            } else {
                priceRange = 'R$ 20,01+'
            }

            const rangeData = priceRangesMap.get(priceRange) || { count: 0, totalPrice: 0 }
            rangeData.count += 1
            rangeData.totalPrice += price
            priceRangesMap.set(priceRange, rangeData)
        }
    }

    const totalOrders = orders.length
    const totalTimeOrders = Array.from(timeRangesMap.values()).reduce((sum, data) => sum + data.count, 0)
    const totalPriceOrders = Array.from(priceRangesMap.values()).reduce((sum, data) => sum + data.count, 0)

    const deliveryTypes: DeliveryTypeStats[] = Array.from(deliveryTypeMap.entries())
        .map(([type, count]) => ({
            type,
            count,
            percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

    const timeRanges: DeliveryTimeRangeStats[] = Array.from(timeRangesMap.entries())
        .map(([range, data]) => ({
            range,
            count: data.count,
            percentage: totalTimeOrders > 0 ? (data.count / totalTimeOrders) * 100 : 0,
            averageTime: data.count > 0 ? data.totalTime / data.count : 0,
        }))
        .sort((a, b) => {
            const getOrder = (r: string) => {
                if (r.startsWith('0-')) return 1
                if (r.startsWith('30-')) return 2
                if (r.startsWith('45-')) return 3
                if (r.startsWith('60-')) return 4
                return 5
            }
            return getOrder(a.range) - getOrder(b.range)
        })

    const priceRanges: DeliveryPriceRangeStats[] = Array.from(priceRangesMap.entries())
        .map(([range, data]) => ({
            range,
            count: data.count,
            percentage: totalPriceOrders > 0 ? (data.count / totalPriceOrders) * 100 : 0,
            averagePrice: data.count > 0 ? data.totalPrice / data.count : 0,
        }))
        .sort((a, b) => {
            const getOrder = (r: string) => {
                if (r === 'Grátis') return 0
                if (r.includes('0 - R$ 5')) return 1
                if (r.includes('5,01 - R$ 10')) return 2
                if (r.includes('10,01 - R$ 15')) return 3
                if (r.includes('15,01 - R$ 20')) return 4
                return 5
            }
            return getOrder(a.range) - getOrder(b.range)
        })

    return {
        deliveryTypes,
        timeRanges,
        priceRanges,
    }
}

interface MotoboyStats {
    name: string
    ordersCount: number
    percentage: number
}

interface MotoboysStatsResult {
    motoboys: MotoboyStats[]
    total: number
    cached?: boolean
}

let cachedMotoboysStats: MotoboyStats[] | null = null
let lastMotoboysStatsCacheTime: number = 0
let lastMotoboysStatsFileMtimeMs: number | null = null
let lastMotoboysStatsFileSize: number | null = null

export async function getMotoboysStats(startDate?: string, endDate?: string): Promise<MotoboysStatsResult> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedMotoboysStats === null || (now - lastMotoboysStatsCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(ORDERS_FILE_PATH)
            const hasFileChanged =
                (lastMotoboysStatsFileMtimeMs !== null && stats.mtimeMs !== lastMotoboysStatsFileMtimeMs) ||
                (lastMotoboysStatsFileSize !== null && stats.size !== lastMotoboysStatsFileSize)

            if (hasFileChanged) {
                cachedMotoboysStats = null
            }
            lastMotoboysStatsFileMtimeMs = stats.mtimeMs
            lastMotoboysStatsFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedMotoboysStats !== null && (now - lastMotoboysStatsCacheTime) < CACHE_TTL) {
            return {
                motoboys: cachedMotoboysStats,
                total: cachedMotoboysStats.reduce((sum, item) => sum + item.ordersCount, 0),
                cached: true,
            }
        }

        const motoboys = await calculateMotoboysStats(startDate, endDate)
        if (!startDate && !endDate) {
            cachedMotoboysStats = motoboys
            lastMotoboysStatsCacheTime = now
        }

        return {
            motoboys,
            total: motoboys.reduce((sum, item) => sum + item.ordersCount, 0),
            cached: false,
        }
    }

    return {
        motoboys: cachedMotoboysStats,
        total: cachedMotoboysStats.reduce((sum, item) => sum + item.ordersCount, 0),
        cached: true,
    }
}

function normalizeMotoboyName(name: string | null): string {
    if (!name || typeof name !== 'string') {
        return 'Não atribuído'
    }
    return name.trim()
}

async function calculateMotoboysStats(startDate?: string, endDate?: string): Promise<MotoboyStats[]> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const orders = JSON.parse(fileContent) as Order[]

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const motoboyMap = new Map<string, number>()

    for (const order of orders) {
        if (startDate || endDate) {
            if (!order.createdAt?.iso) {
                continue
            }
            const createdAt = new Date(order.createdAt.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }
        const motoboyName = normalizeMotoboyName(order.motoboy?.name || null)
        const count = motoboyMap.get(motoboyName) || 0
        motoboyMap.set(motoboyName, count + 1)
    }

    const total = orders.length

    const motoboys: MotoboyStats[] = Array.from(motoboyMap.entries())
        .map(([name, ordersCount]) => ({
            name,
            ordersCount,
            percentage: total > 0 ? (ordersCount / total) * 100 : 0,
        }))
        .sort((a, b) => b.ordersCount - a.ordersCount)

    return motoboys
}

interface OrdersByDayStats {
    date: string
    count: number
}

interface OrdersByDayResult {
    data: OrdersByDayStats[]
    cached?: boolean
}

let cachedOrdersByDay: OrdersByDayStats[] | null = null
let lastOrdersByDayCacheTime: number = 0
let lastOrdersByDayFileMtimeMs: number | null = null
let lastOrdersByDayFileSize: number | null = null

export async function getOrdersByDayLast30Days(): Promise<OrdersByDayResult> {
    const now = Date.now()

    try {
        const stats = await stat(ORDERS_FILE_PATH)
        const hasFileChanged =
            (lastOrdersByDayFileMtimeMs !== null && stats.mtimeMs !== lastOrdersByDayFileMtimeMs) ||
            (lastOrdersByDayFileSize !== null && stats.size !== lastOrdersByDayFileSize)

        if (hasFileChanged) {
            cachedOrdersByDay = null
        }
        lastOrdersByDayFileMtimeMs = stats.mtimeMs
        lastOrdersByDayFileSize = stats.size
    } catch {
        // If stat fails, fall through to cache TTL check
    }

    if (cachedOrdersByDay === null || (now - lastOrdersByDayCacheTime) >= CACHE_TTL) {
        const data = await calculateOrdersByDayLast30Days()
        cachedOrdersByDay = data
        lastOrdersByDayCacheTime = now
        return {
            data,
            cached: false,
        }
    }

    return {
        data: cachedOrdersByDay,
        cached: true,
    }
}

async function calculateOrdersByDayLast30Days(): Promise<OrdersByDayStats[]> {
    const fileContent = await readFile(ORDERS_FILE_PATH, 'utf8')
    const orders = JSON.parse(fileContent) as Order[]

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ordersByDayMap = new Map<string, number>()

    for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        ordersByDayMap.set(dateKey, 0)
    }

    for (const order of orders) {
        if (!order.createdAt?.iso) {
            continue
        }

        const createdAt = new Date(order.createdAt.iso)
        createdAt.setHours(0, 0, 0, 0)

        if (createdAt < thirtyDaysAgo || createdAt > today) {
            continue
        }

        const dateKey = createdAt.toISOString().split('T')[0]
        const currentCount = ordersByDayMap.get(dateKey) || 0
        ordersByDayMap.set(dateKey, currentCount + 1)
    }

    const result: OrdersByDayStats[] = Array.from(ordersByDayMap.entries())
        .map(([date, count]) => ({
            date,
            count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return result
}

