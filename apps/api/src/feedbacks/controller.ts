import type { FastifyReply, FastifyRequest } from 'fastify'
import { getFeedbackAverageAndCount, getFeedbackAnalysisWithInsights as getFeedbackAnalysisWithInsightsService } from './service'

type FeedbacksQuery = {
    storeId?: string
    forceRefresh?: string
    startDate?: string
    endDate?: string
}

export async function getFeedbackAverage(
    request: FastifyRequest<{ Querystring: FeedbacksQuery }>,
    reply: FastifyReply
) {
    try {
        const { storeId, startDate, endDate } = request.query || {}
        const result = await getFeedbackAverageAndCount(storeId, startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error computing feedbacks average')
        return reply.code(500).send({
            success: false,
            error: 'Failed to compute feedbacks average',
        })
    }
}

export async function getFeedbackAnalysisWithInsights(
    request: FastifyRequest<{ Querystring: FeedbacksQuery }>,
    reply: FastifyReply
) {
    try {
        const { storeId, forceRefresh, startDate, endDate } = request.query || {}
        const shouldForceRefresh = forceRefresh === 'true' || forceRefresh === '1'
        const analysis = await getFeedbackAnalysisWithInsightsService(storeId, shouldForceRefresh, startDate, endDate)

        return reply.code(200).send({
            success: true,
            data: analysis,
        })
    } catch (error) {
        request.log.error(error, 'Error computing feedbacks analysis')
        return reply.code(500).send({
            success: false,
            error: 'Failed to compute feedbacks analysis',
        })
    }
}


