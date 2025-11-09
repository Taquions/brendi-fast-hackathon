import { FastifyPluginAsync } from 'fastify'
import { getInsights } from './controller'

export const menuEventsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/menu-events/insights', async (request, reply) => {
        return getInsights(request, reply)
    })
}

