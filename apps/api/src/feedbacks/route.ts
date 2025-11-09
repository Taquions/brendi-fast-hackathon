import { FastifyPluginAsync } from 'fastify'
import { getFeedbackAverage, getFeedbackAnalysisWithInsights } from './controller'

type FeedbacksQuery = {
    storeId?: string
    forceRefresh?: string
    startDate?: string
    endDate?: string
}

export const feedbacksRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: FeedbacksQuery }>('/api/feedbacks/average', async (request, reply) => {
        return getFeedbackAverage(request, reply)
    })
    
    fastify.get<{ Querystring: FeedbacksQuery }>('/api/feedbacks/analysis', async (request, reply) => {
        return getFeedbackAnalysisWithInsights(request, reply)
    })
}


