import { z } from 'zod'
import { env } from '../../config/config'

const apiAnalysisItemSchema = z.object({
    why: z.string().describe('The reason for using or not using the API'),
    use: z.boolean().describe('Whether the API should be used to answer the question'),
})

export const apiAnalysisSchema = z.object({
    campaign: apiAnalysisItemSchema,
    menu: apiAnalysisItemSchema,
    orders: apiAnalysisItemSchema,
    consumers: apiAnalysisItemSchema,
    feedbacks: apiAnalysisItemSchema,
    store: apiAnalysisItemSchema,
    timeFilter: z.object({
        type: z.enum(['1d', '7d', '30d', 'all', 'custom']).describe('Time filter type: 1d (last day), 7d (last 7 days), 30d (last 30 days), all (all time), custom (specific date range)'),
        startDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) - only for custom type'),
        endDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) - only for custom type'),
    }).optional().describe('Time period filter to apply to API requests. Extract from user question if they mention time periods like "last 30 days", "this week", "last month", etc.'),
})

export type ApiAnalysisResult = z.infer<typeof apiAnalysisSchema>

export const restaurantManagerSystemPrompt = `You are an expert restaurant management consultant with deep expertise in data analysis, operations optimization, and business intelligence for restaurants.

Your role is to help restaurant managers make data-driven decisions by analyzing their business data and providing actionable insights.

WORKFLOW:
1. **Analyze the user's question**: Understand what information they need and what business question they're trying to answer.

2. **Select appropriate tools**: Based on the question, determine which data sources (APIs) you need to access:
   - campaign: Marketing campaigns, performance metrics, conversion rates, voucher usage
   - menu: Menu item performance, product popularity, menu analytics, item views/clicks
   - orders: Order statistics, revenue, popular items, payment methods, delivery data
   - consumers: Customer statistics, new customers, customer segmentation, customer base
   - feedbacks: Customer satisfaction, feedback analysis, ratings, customer opinions
   - store: Store information, business details, address, owner, company document, working hours, status

3. **Execute tools and gather data**: Use the selected tools to retrieve the necessary data.

4. **Analyze and decide**:
   - If you have enough data to provide a complete answer → proceed to respond
   - If you need additional data to fully answer → select and execute additional tools
   - If the data reveals new questions or insights → you may need to dig deeper with more tools

5. **Provide expert response**: Deliver clear, actionable insights with:
   - Data-driven analysis
   - Business context and implications
   - Recommendations when appropriate
   - Specific metrics and numbers when available

EXPERTISE AREAS:
- Revenue optimization and financial analysis
- Customer behavior and segmentation
- Marketing campaign effectiveness
- Menu engineering and product performance
- Operational efficiency
- Customer satisfaction and retention
- Growth strategies

CAvailable APIs:
1. campaign - Campaign management and performance data
   - Use for: campaign performance, marketing metrics, voucher analysis, conversion rates, campaign ROI

2. menu - Menu events and insights
   - Use for: menu item performance, product popularity, menu analytics, item views/clicks, product trends

3. orders - Order data and statistics
   - Use for: order statistics, revenue analysis, popular items, payment methods, delivery data, order trends

4. consumers - Consumer data and statistics
   - Use for: customer statistics, new customers, customer segmentation, customer base analysis, retention metrics

5. feedbacks - Customer feedback and ratings
   - Use for: customer satisfaction, feedback analysis, ratings, customer opinions, service quality insights

6. store - Store information and business details
   - Use for: store name, brand information, address, owner details, company document (CNPJ), working hours, store status


TIME FILTERING:
- Many APIs support time-based filtering using startDate and endDate query parameters
- When users mention time periods, extract and apply appropriate filters:
  - "último dia", "hoje", "last day", "today" → 1d
  - "últimos 7 dias", "esta semana", "last 7 days", "this week" → 7d
  - "últimos 30 dias", "último mês", "last 30 days", "last month" → 30d
  - "todo o período", "all time", "tudo" → all
  - Specific dates or ranges → custom with startDate and endDate
- APIs that support time filtering:
  - orders: total, revenue, most-ordered, payment-types, delivery, motoboys
  - feedbacks: average
- Always include timeFilter in your analysis when the user mentions a time period

Remember: You're not just retrieving data - you're providing expert analysis and recommendations to help the restaurant succeed.`


const API_BASE_URL = `http://localhost:${env.PORT}`

const API_ENDPOINTS = {
    campaign: [
        '/api/campaigns/summary',
        '/api/campaigns/performance',
        '/api/campaigns/conversion',
        '/api/campaigns/revenue',
        '/api/campaigns/vouchers',
        '/api/campaigns/status',
        '/api/campaigns/custom-analysis',
        '/api/campaigns/top-performing',
    ],
    menu: [
        '/api/menu-events/insights',
    ],
    orders: [
        '/api/orders/total',
        '/api/orders/revenue',
        '/api/orders/most-ordered',
        '/api/orders',
        '/api/orders/payment-types',
        '/api/orders/delivery',
        '/api/orders/motoboys',
    ],
    consumers: [
        '/api/consumers/stats',
        '/api/consumers/new',
        '/api/consumers/new-zero-orders',
        '/api/consumer-preferences/stats',
    ],
    feedbacks: [
        '/api/feedbacks/average',
        '/api/feedbacks/analysis',
    ],
    store: [
        '/api/store',
    ],
} as const

function cleanDataForLLM(data: any, maxArrayItems: number = 20): any {
    if (data === null || data === undefined) {
        return null
    }

    if (Array.isArray(data)) {
        const cleaned = data.slice(0, maxArrayItems).map(item => cleanDataForLLM(item, maxArrayItems))
        if (data.length > maxArrayItems) {
            return [...cleaned, `... (${data.length - maxArrayItems} more items)`]
        }
        return cleaned
    }

    if (typeof data === 'object') {
        const cleaned: any = {}

        for (const [key, value] of Object.entries(data)) {
            if (key === 'success' || key === 'cached' || key === '_date') {
                continue
            }

            if (key === 'data' && typeof value === 'object' && value !== null) {
                const cleanedData = cleanDataForLLM(value, maxArrayItems)
                if (Array.isArray(cleanedData)) {
                    cleaned[key] = cleanedData
                } else {
                    Object.assign(cleaned, cleanedData)
                }
                continue
            }

            if (key === 'error') {
                cleaned[key] = value
                continue
            }

            if ((key.includes('_id') || key === 'id') && typeof value === 'string' && value.length > 30) {
                continue
            }

            if (key === 'timestamp' || key === 'created_at' || key === 'updated_at') {
                if (typeof value === 'object' && value !== null && 'iso' in value) {
                    cleaned[key] = value.iso
                } else if (typeof value === 'string') {
                    cleaned[key] = value
                }
                continue
            }

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                if (Object.keys(value).length === 0) {
                    continue
                }
                const cleanedValue = cleanDataForLLM(value, maxArrayItems)
                if (Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue
                }
                continue
            }

            cleaned[key] = cleanDataForLLM(value, maxArrayItems)
        }

        return cleaned
    }

    return data
}

function getDateRangeFromFilter(timeFilter?: ApiAnalysisResult['timeFilter']): { startDate?: string; endDate?: string } {
    if (!timeFilter || timeFilter.type === 'all') {
        return {}
    }

    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    switch (timeFilter.type) {
        case '1d': {
            const oneDayAgo = new Date(endDate)
            oneDayAgo.setDate(oneDayAgo.getDate() - 1)
            return {
                startDate: oneDayAgo.toISOString(),
                endDate: endDate.toISOString(),
            }
        }
        case '7d': {
            const sevenDaysAgo = new Date(endDate)
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            return {
                startDate: sevenDaysAgo.toISOString(),
                endDate: endDate.toISOString(),
            }
        }
        case '30d': {
            const thirtyDaysAgo = new Date(endDate)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return {
                startDate: thirtyDaysAgo.toISOString(),
                endDate: endDate.toISOString(),
            }
        }
        case 'custom': {
            return {
                startDate: timeFilter.startDate,
                endDate: timeFilter.endDate,
            }
        }
        default:
            return {}
    }
}

function shouldApplyTimeFilter(endpoint: string): boolean {
    const timeFilterableEndpoints = [
        '/api/orders/total',
        '/api/orders/revenue',
        '/api/orders/most-ordered',
        '/api/orders/payment-types',
        '/api/orders/delivery',
        '/api/orders/motoboys',
        '/api/feedbacks/average',
    ]
    return timeFilterableEndpoints.some(filterable => endpoint.includes(filterable))
}

async function fetchApiEndpoint(endpoint: string, timeFilter?: ApiAnalysisResult['timeFilter']): Promise<string> {
    try {
        let url = `${API_BASE_URL}${endpoint}`

        if (timeFilter && shouldApplyTimeFilter(endpoint)) {
            const dateRange = getDateRangeFromFilter(timeFilter)
            const params = new URLSearchParams()
            if (dateRange.startDate) {
                params.append('startDate', dateRange.startDate)
            }
            if (dateRange.endDate) {
                params.append('endDate', dateRange.endDate)
            }
            const queryString = params.toString()
            if (queryString) {
                url += `?${queryString}`
            }
        }

        const response = await fetch(url)
        if (!response.ok) {
            return `Error: ${response.status} ${response.statusText}`
        }
        const rawData = await response.json()
        const cleanedData = cleanDataForLLM(rawData)
        return JSON.stringify(cleanedData, null, 2)
    } catch (error) {
        return `Error fetching ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
}

async function fetchApiData(apiName: keyof typeof API_ENDPOINTS, timeFilter?: ApiAnalysisResult['timeFilter']): Promise<string> {
    const endpoints = API_ENDPOINTS[apiName]
    const results = await Promise.all(
        endpoints.map(async (endpoint) => {
            const data = await fetchApiEndpoint(endpoint, timeFilter)
            return `\n--- ${endpoint}${timeFilter && shouldApplyTimeFilter(endpoint) ? ` (${timeFilter.type})` : ''} ---\n${data}`
        })
    )
    return results.join('\n')
}

export async function executeApisTool(analysis: ApiAnalysisResult): Promise<string> {
    const results: string[] = []
    const timeFilter = analysis.timeFilter

    if (analysis.campaign.use) {
        results.push(`\n=== CAMPAIGN DATA ===\n${await fetchApiData('campaign', timeFilter)}`)
    }

    if (analysis.menu.use) {
        results.push(`\n=== MENU DATA ===\n${await fetchApiData('menu', timeFilter)}`)
    }

    if (analysis.orders.use) {
        results.push(`\n=== ORDERS DATA ===\n${await fetchApiData('orders', timeFilter)}`)
    }

    if (analysis.consumers.use) {
        results.push(`\n=== CONSUMERS DATA ===\n${await fetchApiData('consumers', timeFilter)}`)
    }

    if (analysis.feedbacks.use) {
        results.push(`\n=== FEEDBACKS DATA ===\n${await fetchApiData('feedbacks', timeFilter)}`)
    }

    if (analysis.store.use) {
        results.push(`\n=== STORE DATA ===\n${await fetchApiData('store', timeFilter)}`)
    }

    if (results.length === 0) {
        return 'No APIs were selected for data retrieval.'
    }

    return results.join('\n\n')
}

export const analyzeApisTool = {
    description: [
        'Description: Analyze restaurant management questions and determine which APIs should be consumed to answer them.',
        'As an expert restaurant management consultant, you need to identify which data sources are necessary to provide a comprehensive answer.',
        'Available APIs:',
        '1. campaign - Campaign and marketing performance data (ROI, conversion rates, voucher usage, campaign effectiveness)',
        '2. menu - Menu events and insights (product popularity, menu performance, item analytics, product trends)',
        '3. orders - Order data and statistics (revenue, order trends, payment methods, delivery, popular items)',
        '4. consumers - Consumer data and statistics (customer base, segmentation, retention, new customers, customer growth)',
        '5. feedbacks - Customer feedback and ratings (satisfaction scores, feedback analysis, service quality, customer opinions)',
        '6. store - Store information and business details (store name, brand, address, owner, company document, working hours, status)',
        '',
        'TIME FILTERING:',
        'Extract time period information from the user question and include it in the timeFilter field.',
        'Supported time filters:',
        '- 1d: Last day / today ("último dia", "hoje", "last day", "today")',
        '- 7d: Last 7 days / this week ("últimos 7 dias", "esta semana", "last 7 days", "this week")',
        '- 30d: Last 30 days / last month ("últimos 30 dias", "último mês", "last 30 days", "last month")',
        '- all: All time / no filter ("todo o período", "all time", "tudo")',
        '- custom: Specific date range (provide startDate and endDate in ISO format)',
        'APIs that support time filtering:',
        '  - orders: total, revenue, most-ordered, payment-types, delivery, motoboys',
        '  - feedbacks: average',
        '',
        'Return an object where each API name is a key with use (boolean) and why (string) properties.',
        'The "why" field should explain the business reason for using or not using each API.',
        'Always include timeFilter when the user mentions a time period.',
        '',
        'Examples:',
        '- "What campaigns are performing best?" → campaign: use=true, why="Need campaign performance data to identify top performers"',
        '- "How is our revenue trending?" → orders: use=true, why="Revenue data comes from order statistics"',
        '- "Are customers satisfied with our service?" → feedbacks: use=true, why="Customer satisfaction metrics are in feedback data"',
        '- "What products should we promote?" → menu: use=true, orders: use=true, why="Need menu performance and order data to identify best products"',
        '- "Why are we losing customers?" → consumers: use=true, feedbacks: use=true, orders: use=true, why="Need customer data, feedback, and order patterns to understand churn"',
        '- "How many orders did we have in the last 30 days?" → orders: use=true, timeFilter: {type: "30d"}, why="Need order data filtered to last 30 days"',
        '- "What was our revenue last week?" → orders: use=true, timeFilter: {type: "7d"}, why="Need revenue data for last 7 days"',
        '- "Show me feedbacks from this month" → feedbacks: use=true, timeFilter: {type: "30d"}, why="Need feedback data from last 30 days"',
        '- "What is the store address?" → store: use=true, why="Need store information including address details"',
        '- "Tell me about the business" → store: use=true, why="Need store information including name, brand, owner, and company details"',
        '- "What are the working hours?" → store: use=true, why="Need store information including working hours"',
    ].join('\n'),
    inputSchema: apiAnalysisSchema,
    execute: async (analysis: ApiAnalysisResult): Promise<string> => {
        try {
            return await executeApisTool(analysis)
        } catch (error) {
            return `Error fetching API data: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    },
}

