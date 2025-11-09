import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { resolve } from 'path'

interface ConsumerPreference {
    id: string
    store_consumer_id: string
    bot_optout: boolean
    campaign_optout: boolean
    best_campaign_hour?: number | null
    best_campaign_weekday?: string | null
    last_order_hour?: number | null
    last_order_weekday?: string | null
}

interface CampaignOptoutStats {
    enabled: number
    disabled: number
    total: number
}

interface HourDistribution {
    [hour: number]: number
}

interface WeekdayDistribution {
    [weekday: string]: number
}

interface ConsumerPreferencesStats {
    campaign_optout: CampaignOptoutStats
    best_campaign_hour: HourDistribution
    best_campaign_weekday: WeekdayDistribution
    last_order_hour: HourDistribution
    last_order_weekday: WeekdayDistribution
}

function getConsumerPreferencesFilePath(): string {
    const cwd = process.cwd()

    const pathsToTry = [
        resolve(cwd, 'data/store_consumer_preferences.json'),
        resolve(cwd, '../../data/store_consumer_preferences.json'),
    ]

    for (const path of pathsToTry) {
        if (existsSync(path)) {
            return path
        }
    }

    return resolve(cwd, 'data/store_consumer_preferences.json')
}

const CONSUMER_PREFERENCES_FILE_PATH = getConsumerPreferencesFilePath()

let cachedStats: ConsumerPreferencesStats | null = null
let lastCacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000
let lastFileMtimeMs: number | null = null
let lastFileSize: number | null = null

export async function getConsumerPreferencesStats(): Promise<ConsumerPreferencesStats> {
    const now = Date.now()

    try {
        const stats = await stat(CONSUMER_PREFERENCES_FILE_PATH)
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

    if (cachedStats !== null && (now - lastCacheTime) < CACHE_TTL) {
        return cachedStats
    }

    const preferences = await loadConsumerPreferences()
    const stats = calculateStats(preferences)

    cachedStats = stats
    lastCacheTime = now

    return stats
}

async function loadConsumerPreferences(): Promise<ConsumerPreference[]> {
    const fileContent = await readFile(CONSUMER_PREFERENCES_FILE_PATH, 'utf8')
    const parsed = JSON.parse(fileContent)
    
    if (!Array.isArray(parsed)) {
        return []
    }

    return parsed as ConsumerPreference[]
}

function calculateStats(preferences: ConsumerPreference[]): ConsumerPreferencesStats {
    const campaignOptoutStats: CampaignOptoutStats = {
        enabled: 0,
        disabled: 0,
        total: preferences.length,
    }

    const bestCampaignHourDist: HourDistribution = {}
    const bestCampaignWeekdayDist: WeekdayDistribution = {}
    const lastOrderHourDist: HourDistribution = {}
    const lastOrderWeekdayDist: WeekdayDistribution = {}

    for (const preference of preferences) {
        if (preference.campaign_optout === false) {
            campaignOptoutStats.enabled++
        } else {
            campaignOptoutStats.disabled++
        }

        if (preference.best_campaign_hour !== undefined && preference.best_campaign_hour !== null) {
            const hour = preference.best_campaign_hour
            bestCampaignHourDist[hour] = (bestCampaignHourDist[hour] || 0) + 1
        }

        if (preference.best_campaign_weekday) {
            const weekday = preference.best_campaign_weekday.toLowerCase()
            bestCampaignWeekdayDist[weekday] = (bestCampaignWeekdayDist[weekday] || 0) + 1
        }

        if (preference.last_order_hour !== undefined && preference.last_order_hour !== null) {
            const hour = preference.last_order_hour
            lastOrderHourDist[hour] = (lastOrderHourDist[hour] || 0) + 1
        }

        if (preference.last_order_weekday) {
            const weekday = preference.last_order_weekday.toLowerCase()
            lastOrderWeekdayDist[weekday] = (lastOrderWeekdayDist[weekday] || 0) + 1
        }
    }

    return {
        campaign_optout: campaignOptoutStats,
        best_campaign_hour: bestCampaignHourDist,
        best_campaign_weekday: bestCampaignWeekdayDist,
        last_order_hour: lastOrderHourDist,
        last_order_weekday: lastOrderWeekdayDist,
    }
}

