import type { FastifyReply, FastifyRequest } from 'fastify'
import { getConsumerPreferencesStats } from './service'

export async function getConsumerPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await getConsumerPreferencesStats()
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting consumer preferences stats')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get consumer preferences stats',
        })
    }
}

