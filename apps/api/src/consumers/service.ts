import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { resolve } from 'path'

interface ConsumerSummary {
    name: string
    phone: string
    number_of_orders: number
    created_at?: {
        iso?: string
    }
}

interface ConsumersStats {
    total: number
    topConsumers: Array<{
        name: string
        phone: string
        numberOfOrders: number
    }>
}

function getConsumersSummaryFilePath(): string {
    const cwd = process.cwd()

    const pathsToTry = [
        resolve(cwd, 'data/store_consumers_summary.json'),
        resolve(cwd, '../../data/store_consumers_summary.json'),
    ]

    for (const path of pathsToTry) {
        if (existsSync(path)) {
            return path
        }
    }

    return resolve(cwd, 'data/store_consumers_summary.json')
}

const CONSUMERS_SUMMARY_FILE_PATH = getConsumersSummaryFilePath()

let cachedStats: ConsumersStats | null = null
let lastCacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000
let lastFileMtimeMs: number | null = null
let lastFileSize: number | null = null

export async function getConsumersStats(limit: number = 10, startDate?: string, endDate?: string): Promise<ConsumersStats> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedStats === null || (now - lastCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(CONSUMERS_SUMMARY_FILE_PATH)
            const hasFileChanged =
                (lastFileMtimeMs !== null && stats.mtimeMs !== lastFileMtimeMs) ||
                (lastFileSize !== null && stats.size !== lastFileSize)

            if (hasFileChanged) {
                cachedStats = null
            }
            lastFileMtimeMs = stats.mtimeMs
            lastFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedStats !== null && (now - lastCacheTime) < CACHE_TTL) {
            return {
                ...cachedStats,
                topConsumers: cachedStats.topConsumers.slice(0, limit),
            }
        }

        const consumers = await loadConsumersSummary()
        const stats = calculateStats(consumers, limit, startDate, endDate)

        if (!startDate && !endDate) {
            cachedStats = stats
            lastCacheTime = now
        }

        return stats
    }

    return {
        ...cachedStats,
        topConsumers: cachedStats.topConsumers.slice(0, limit),
    }
}

async function loadConsumersSummary(): Promise<ConsumerSummary[]> {
    const fileContent = await readFile(CONSUMERS_SUMMARY_FILE_PATH, 'utf8')
    const parsed = JSON.parse(fileContent)

    if (!Array.isArray(parsed)) {
        return []
    }

    return parsed as ConsumerSummary[]
}

function calculateStats(consumers: ConsumerSummary[], limit: number, startDate?: string, endDate?: string): ConsumersStats {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    let filteredConsumers = consumers

    if (startDate || endDate) {
        filteredConsumers = consumers.filter((consumer) => {
            if (!consumer.created_at?.iso) {
                return false
            }
            const createdAt = new Date(consumer.created_at.iso)
            if (start && createdAt < start) {
                return false
            }
            if (end && createdAt > end) {
                return false
            }
            return true
        })
    }

    const consumersWithOrders = filteredConsumers.filter((consumer) => consumer.number_of_orders >= 1)

    const sortedConsumers = [...consumersWithOrders].sort(
        (a, b) => b.number_of_orders - a.number_of_orders
    )

    const topConsumers = sortedConsumers.slice(0, limit).map((consumer) => ({
        name: consumer.name || 'Sem nome',
        phone: consumer.phone,
        numberOfOrders: consumer.number_of_orders,
    }))

    return {
        total: consumersWithOrders.length,
        topConsumers,
    }
}

interface NewConsumer {
    name: string
    phone: string
    numberOfOrders: number
    createdAt: string
}

let cachedNewConsumers: NewConsumer[] | null = null
let lastNewConsumersCacheTime: number = 0
let lastNewConsumersFileMtimeMs: number | null = null
let lastNewConsumersFileSize: number | null = null

export async function getNewConsumers(startDate?: string, endDate?: string): Promise<NewConsumer[]> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedNewConsumers === null || (now - lastNewConsumersCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(CONSUMERS_SUMMARY_FILE_PATH)
            const hasFileChanged =
                (lastNewConsumersFileMtimeMs !== null && stats.mtimeMs !== lastNewConsumersFileMtimeMs) ||
                (lastNewConsumersFileSize !== null && stats.size !== lastNewConsumersFileSize)

            if (hasFileChanged) {
                cachedNewConsumers = null
            }
            lastNewConsumersFileMtimeMs = stats.mtimeMs
            lastNewConsumersFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedNewConsumers !== null && (now - lastNewConsumersCacheTime) < CACHE_TTL) {
            return cachedNewConsumers
        }

        const consumers = await loadConsumersSummary()
        const newConsumers = calculateNewConsumers(consumers, startDate, endDate)

        if (!startDate && !endDate) {
            cachedNewConsumers = newConsumers
            lastNewConsumersCacheTime = now
        }

        return newConsumers
    }

    return cachedNewConsumers
}

function calculateNewConsumers(consumers: ConsumerSummary[], startDate?: string, endDate?: string): NewConsumer[] {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const newConsumers = consumers
        .filter((consumer) => {
            if (!consumer.created_at?.iso) {
                return false
            }

            const createdAt = new Date(consumer.created_at.iso)
            
            if (startDate || endDate) {
                if (start && createdAt < start) {
                    return false
                }
                if (end && createdAt > end) {
                    return false
                }
            } else {
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                if (createdAt < thirtyDaysAgo) {
                    return false
                }
            }

            const hasMoreThan1Order = consumer.number_of_orders > 1
            return hasMoreThan1Order
        })
        .sort((a, b) => {
            const dateA = new Date(a.created_at?.iso || 0)
            const dateB = new Date(b.created_at?.iso || 0)
            return dateB.getTime() - dateA.getTime()
        })
        .map((consumer) => ({
            name: consumer.name || 'Sem nome',
            phone: consumer.phone,
            numberOfOrders: consumer.number_of_orders,
            createdAt: consumer.created_at?.iso || '',
        }))

    return newConsumers
}

let cachedNewConsumersWithZeroOrders: NewConsumer[] | null = null
let lastNewConsumersWithZeroOrdersCacheTime: number = 0
let lastNewConsumersWithZeroOrdersFileMtimeMs: number | null = null
let lastNewConsumersWithZeroOrdersFileSize: number | null = null

export async function getNewConsumersWithZeroOrders(startDate?: string, endDate?: string): Promise<NewConsumer[]> {
    const now = Date.now()

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || cachedNewConsumersWithZeroOrders === null || (now - lastNewConsumersWithZeroOrdersCacheTime) >= CACHE_TTL) {
        try {
            const stats = await stat(CONSUMERS_SUMMARY_FILE_PATH)
            const hasFileChanged =
                (lastNewConsumersWithZeroOrdersFileMtimeMs !== null && stats.mtimeMs !== lastNewConsumersWithZeroOrdersFileMtimeMs) ||
                (lastNewConsumersWithZeroOrdersFileSize !== null && stats.size !== lastNewConsumersWithZeroOrdersFileSize)

            if (hasFileChanged) {
                cachedNewConsumersWithZeroOrders = null
            }
            lastNewConsumersWithZeroOrdersFileMtimeMs = stats.mtimeMs
            lastNewConsumersWithZeroOrdersFileSize = stats.size
        } catch {
            // If stat fails, fall through to cache TTL check
        }

        if (!startDate && !endDate && cachedNewConsumersWithZeroOrders !== null && (now - lastNewConsumersWithZeroOrdersCacheTime) < CACHE_TTL) {
            return cachedNewConsumersWithZeroOrders
        }

        const consumers = await loadConsumersSummary()
        const newConsumersWithZeroOrders = calculateNewConsumersWithZeroOrders(consumers, startDate, endDate)

        if (!startDate && !endDate) {
            cachedNewConsumersWithZeroOrders = newConsumersWithZeroOrders
            lastNewConsumersWithZeroOrdersCacheTime = now
        }

        return newConsumersWithZeroOrders
    }

    return cachedNewConsumersWithZeroOrders
}

function calculateNewConsumersWithZeroOrders(consumers: ConsumerSummary[], startDate?: string, endDate?: string): NewConsumer[] {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const newConsumersWithZeroOrders = consumers
        .filter((consumer) => {
            if (!consumer.created_at?.iso) {
                return false
            }

            const createdAt = new Date(consumer.created_at.iso)
            
            if (startDate || endDate) {
                if (start && createdAt < start) {
                    return false
                }
                if (end && createdAt > end) {
                    return false
                }
            } else {
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                if (createdAt < thirtyDaysAgo) {
                    return false
                }
            }

            const hasZeroOrders = consumer.number_of_orders === 0
            return hasZeroOrders
        })
        .sort((a, b) => {
            const dateA = new Date(a.created_at?.iso || 0)
            const dateB = new Date(b.created_at?.iso || 0)
            return dateB.getTime() - dateA.getTime()
        })
        .map((consumer) => ({
            name: consumer.name || 'Sem nome',
            phone: consumer.phone,
            numberOfOrders: consumer.number_of_orders,
            createdAt: consumer.created_at?.iso || '',
        }))

    return newConsumersWithZeroOrders
}

