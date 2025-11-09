import { FastifyPluginAsync } from 'fastify'
import type { ChatRequest } from '@brendi/types'
import { handleChatRequest } from './controller'

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{
        Body: ChatRequest
    }>('/api/chat', async (request, reply) => {
        return handleChatRequest(request, reply)
    })
}

