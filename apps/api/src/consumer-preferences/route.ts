import { FastifyPluginAsync } from 'fastify'
import { getConsumerPreferences } from './controller'

export const consumerPreferencesRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/api/consumer-preferences/stats', async (request, reply) => {
        return getConsumerPreferences(request, reply)
    })
}

