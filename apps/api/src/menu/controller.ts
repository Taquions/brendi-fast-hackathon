import type { FastifyReply, FastifyRequest } from 'fastify'
import { getMenuEventsInsights } from './service'

export async function getInsights(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getMenuEventsInsights(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting menu events insights')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get menu events insights',
        })
    }
}

