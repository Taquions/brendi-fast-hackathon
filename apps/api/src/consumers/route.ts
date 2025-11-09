import { FastifyPluginAsync } from 'fastify'
import { getConsumers, getNewConsumersController, getNewConsumersWithZeroOrdersController } from './controller'

export const consumersRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: { limit?: string; startDate?: string; endDate?: string } }>('/api/consumers/stats', async (request, reply) => {
        return getConsumers(request, reply)
    })

    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/consumers/new', async (request, reply) => {
        return getNewConsumersController(request, reply)
    })

    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/consumers/new-zero-orders', async (request, reply) => {
        return getNewConsumersWithZeroOrdersController(request, reply)
    })
}

