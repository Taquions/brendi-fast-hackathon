import type { FastifyReply, FastifyRequest } from 'fastify'
import { getStoreInfo } from './service'

export async function getStore(request: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await getStoreInfo()
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error fetching store information')
        return reply.code(500).send({
            success: false,
            error: 'Failed to fetch store information',
        })
    }
}

