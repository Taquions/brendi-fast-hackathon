import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { resolve } from 'path'

function getFeedbacksFilePath(): string {
    const cwd = process.cwd()
    const candidates = [
        resolve(cwd, 'data/feedbacks.json'),
        resolve(cwd, '../../data/feedbacks.json'),
    ]
    for (const path of candidates) {
        if (existsSync(path)) {
            return path
        }
    }
    // Default fallback
    return resolve(cwd, 'data/feedbacks.json')
}

const FEEDBACKS_FILE_PATH = getFeedbacksFilePath()
const CACHE_TTL_MS = 5 * 60 * 1000
const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000

export interface FeedbackAverageResult {
    averageRating: number
    totalFeedbacks: number
    cached?: boolean
}

export interface Feedback {
    id: string
    store_consumer_id: string
    created_at: {
        _date: boolean
        iso: string
    }
    updated_at: {
        _date: boolean
        iso: string
    }
    category: string
    order_id: string
    rated_response?: string
    rating: number
    store_id: string
}

export interface FeedbackAnalysis {
    overallAverage: number
    last30Average: number
    trend: 'improving' | 'declining' | 'stable'
    negativeFeedbacks: Array<{
        id: string
        rating: number
        rated_response?: string
        created_at: string
    }>
    insights?: string
    cached?: boolean
}

type CacheKey = string // '' for all stores or storeId

let cachedByKey: Map<CacheKey, FeedbackAverageResult> = new Map()
let lastCacheTimeByKey: Map<CacheKey, number> = new Map()
let cachedAnalysisByKey: Map<CacheKey, FeedbackAnalysis> = new Map()
let lastAnalysisCacheTimeByKey: Map<CacheKey, number> = new Map()
let lastFileMtimeMs: number | null = null
let lastFileSize: number | null = null

export async function getFeedbackAverageAndCount(
    storeId?: string,
    startDate?: string,
    endDate?: string
): Promise<FeedbackAverageResult> {
    await invalidateCacheIfFileChanged()

    const key: CacheKey = storeId ?? ''
    const now = Date.now()
    const lastTime = lastCacheTimeByKey.get(key)
    const cached = cachedByKey.get(key)

    // Don't use cache if date filters are provided
    if ((startDate || endDate) || !cached || !lastTime || now - lastTime >= CACHE_TTL_MS) {
        const { averageRating, totalFeedbacks } = await computeFromFile(storeId, startDate, endDate)
        const result: FeedbackAverageResult = {
            averageRating,
            totalFeedbacks,
            cached: false,
        }
        if (!startDate && !endDate) {
            cachedByKey.set(key, result)
            lastCacheTimeByKey.set(key, now)
        }
        return result
    }

    return { ...cached, cached: true }
}

async function invalidateCacheIfFileChanged() {
    try {
        const stats = await stat(FEEDBACKS_FILE_PATH)
        const hasChanged =
            (lastFileMtimeMs !== null && stats.mtimeMs !== lastFileMtimeMs) ||
            (lastFileSize !== null && stats.size !== lastFileSize)

        if (hasChanged) {
            cachedByKey.clear()
            lastCacheTimeByKey.clear()
            cachedAnalysisByKey.clear()
            lastAnalysisCacheTimeByKey.clear()
        }
        lastFileMtimeMs = stats.mtimeMs
        lastFileSize = stats.size
    } catch {
        // If stat fails, ignore and fall back to TTL behavior
    }
}

async function computeFromFile(storeId?: string, startDate?: string, endDate?: string) {
    const raw = await readFile(FEEDBACKS_FILE_PATH, 'utf8')
    const data = JSON.parse(raw) as Array<{
        rating?: unknown
        store_id?: string
        created_at?: { iso?: string }
    }>

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    let sum = 0
    let count = 0
    for (const item of data) {
        if (storeId && item.store_id !== storeId) continue

        if (startDate || endDate) {
            if (!item.created_at?.iso) {
                continue
            }
            const createdAt = new Date(item.created_at.iso)
            if (start && createdAt < start) {
                continue
            }
            if (end && createdAt > end) {
                continue
            }
        }

        if (typeof item.rating === 'number' && Number.isFinite(item.rating)) {
            sum += item.rating
            count += 1
        }
    }

    if (count === 0) {
        return { averageRating: 0, totalFeedbacks: 0 }
    }
    const avg = Number((sum / count).toFixed(2))
    return { averageRating: avg, totalFeedbacks: count }
}

async function loadFeedbacksFromFile(storeId?: string, startDate?: string, endDate?: string): Promise<Feedback[]> {
    const raw = await readFile(FEEDBACKS_FILE_PATH, 'utf8')
    const data = JSON.parse(raw) as Feedback[]

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    let filtered = data
    if (storeId) {
        filtered = data.filter(item => item.store_id === storeId)
    }

    if (startDate || endDate) {
        filtered = filtered.filter(item => {
            if (!item.created_at?.iso) {
                return false
            }
            const createdAt = new Date(item.created_at.iso)
            if (start && createdAt < start) {
                return false
            }
            if (end && createdAt > end) {
                return false
            }
            return true
        })
    }

    return filtered.filter(item =>
        typeof item.rating === 'number' &&
        Number.isFinite(item.rating)
    )
}

export async function getFeedbackAnalysis(
    storeId?: string,
    forceRefresh: boolean = false,
    startDate?: string,
    endDate?: string
): Promise<FeedbackAnalysis> {
    await invalidateCacheIfFileChanged()

    const key: CacheKey = storeId ?? ''

    // Don't use cache if date filters are provided or force refresh
    if (!(startDate || endDate) && !forceRefresh) {
        const now = Date.now()
        const lastTime = lastAnalysisCacheTimeByKey.get(key)
        const cached = cachedAnalysisByKey.get(key)
        if (cached && lastTime && now - lastTime < ANALYSIS_CACHE_TTL_MS) {
            return { ...cached }
        }
    }

    const feedbacks = await loadFeedbacksFromFile(storeId, startDate, endDate)

    if (feedbacks.length === 0) {
        const emptyResult: FeedbackAnalysis = {
            overallAverage: 0,
            last30Average: 0,
            trend: 'stable',
            negativeFeedbacks: [],
        }
        // Only cache if no date filters are provided
        if (!startDate && !endDate) {
            cachedAnalysisByKey.set(key, emptyResult)
            lastAnalysisCacheTimeByKey.set(key, Date.now())
        }
        return emptyResult
    }

    const sortedFeedbacks = feedbacks.sort((a, b) => {
        const dateA = new Date(a.created_at.iso).getTime()
        const dateB = new Date(b.created_at.iso).getTime()
        return dateB - dateA
    })

    const overallAverage = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
    const last30Feedbacks = sortedFeedbacks.slice(0, 30)
    const last30Average = last30Feedbacks.length > 0
        ? last30Feedbacks.reduce((sum, f) => sum + f.rating, 0) / last30Feedbacks.length
        : overallAverage

    const negativeFeedbacks = sortedFeedbacks
        .filter(f => f.rating < 3)
        .slice(0, 30)
        .map(f => ({
            id: f.id,
            rating: f.rating,
            rated_response: f.rated_response,
            created_at: f.created_at.iso,
        }))

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    const diff = last30Average - overallAverage
    if (diff > 0.01) {
        trend = 'improving'
    } else if (diff < -0.01) {
        trend = 'declining'
    }

    const result: FeedbackAnalysis = {
        overallAverage: Number(overallAverage.toFixed(2)),
        last30Average: Number(last30Average.toFixed(2)),
        trend,
        negativeFeedbacks,
    }

    // Only cache if no date filters are provided
    if (!startDate && !endDate) {
        cachedAnalysisByKey.set(key, result)
        lastAnalysisCacheTimeByKey.set(key, Date.now())
    }

    return result
}

export async function getFeedbackAnalysisWithInsights(
    storeId?: string,
    forceRefresh: boolean = false,
    startDate?: string,
    endDate?: string
): Promise<FeedbackAnalysis> {
    const key: CacheKey = storeId ?? ''

    // Don't use cache if date filters are provided or force refresh
    if (!(startDate || endDate) && !forceRefresh) {
        const now = Date.now()
        const lastTime = lastAnalysisCacheTimeByKey.get(key)
        const cached = cachedAnalysisByKey.get(key)
        if (cached && cached.insights && lastTime && now - lastTime < ANALYSIS_CACHE_TTL_MS) {
            return { ...cached, cached: true }
        }
    }

    const analysis = await getFeedbackAnalysis(storeId, forceRefresh, startDate, endDate)

    if (analysis.negativeFeedbacks.length > 0) {
        const insights = await generateFeedbackInsights(analysis.negativeFeedbacks)
        analysis.insights = insights
    }

    // Only cache if no date filters are provided
    if (!startDate && !endDate) {
        cachedAnalysisByKey.set(key, analysis)
        lastAnalysisCacheTimeByKey.set(key, Date.now())
    }

    return analysis
}

async function generateFeedbackInsights(
    negativeFeedbacks: Array<{ rated_response?: string }>
): Promise<string> {
    if (negativeFeedbacks.length === 0) {
        return 'Nenhum feedback negativo para analisar.'
    }

    const { getChatResponse } = await import('../chat/service')
    const responses = negativeFeedbacks
        .map((f, idx) => `Feedback ${idx + 1}: ${f.rated_response || 'Sem comentário fornecido'}`)
        .join('\n\n')

    const prompt = `Analise os seguintes feedbacks e reclamações de clientes (avaliações abaixo de 3) de um restaurante/loja. Identifique os principais pontos de dor e forneça insights acionáveis em português. Seja conciso e foque nos problemas mais críticos.

Feedbacks:
${responses}

Forneça um resumo das principais reclamações e sugestões de melhoria:`

    try {
        const messages = [
            {
                role: 'user' as const,
                content: prompt,
            },
        ]

        const result = await getChatResponse(messages)
        return result
    } catch (error) {
        console.error('Error generating insights:', error)
        return 'Não foi possível gerar insights no momento.'
    }
}


