import { FastifyPluginAsync } from 'fastify'
import { getStore } from './controller'

export const storeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/api/store', async (request, reply) => {
        return getStore(request, reply)
    })
}

