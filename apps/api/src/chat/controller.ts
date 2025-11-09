import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ChatRequest } from '@brendi/types'
import { validateApiKeys, streamChatResponse } from './service'
import { validateChatRequest } from './validator'

export async function handleChatRequest(
    request: FastifyRequest<{ Body: ChatRequest }>,
    reply: FastifyReply
) {
    const logger = request.log

    try {
        logger.info('Chat request received')

        const validation = validateChatRequest(request.body)
        if (!validation.isValid) {
            logger.warn({ error: validation.error }, 'Invalid request')
            return reply.status(400).send({
                success: false,
                error: validation.error,
            })
        }

        const { messages } = request.body

        const apiKeyValidation = validateApiKeys()
        if (!apiKeyValidation.isValid) {
            logger.error({ error: apiKeyValidation.error }, 'API key validation failed')
            return reply.status(500).send({
                success: false,
                error: apiKeyValidation.error,
            })
        }

        logger.info('Starting chat stream')

        reply.raw.statusCode = 200
        reply.raw.setHeader('Content-Type', 'text/plain; charset=utf-8')
        reply.raw.setHeader('Transfer-Encoding', 'chunked')
        reply.raw.setHeader('Cache-Control', 'no-cache')
        reply.raw.setHeader('Connection', 'keep-alive')
        reply.raw.setHeader(
            'Access-Control-Allow-Origin',
            process.env.CORS_ORIGIN || '*'
        )

        const result = await streamChatResponse(messages)

        let fullResponse = ''

        try {
            for await (const delta of result.textStream) {
                fullResponse += delta

                if (!reply.sent) {
                    reply.raw.write(delta, 'utf8')
                }
            }

            result.saveResponse(fullResponse)
        } catch (streamError) {
            logger.error({ err: streamError }, 'Error during streaming')
            if (!reply.sent) {
                reply.raw.write(`\n\nError: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`)
            }
            throw streamError
        }

        logger.info(
            {
                responseLength: fullResponse.length,
                responsePreview: fullResponse.substring(0, 100),
                conversationId: result.conversationId,
            },
            'Chat response completed'
        )

        if (!reply.sent) {
            reply.raw.end()
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        const errorStack = error instanceof Error ? error.stack : undefined

        logger.error(
            {
                err: error,
                message: 'Error processing chat request',
                errorMessage,
                errorStack,
            },
            'Error processing chat request'
        )

        if (!reply.sent) {
            return reply.status(500).send({
                success: false,
                error: errorMessage,
            })
        }
    }
}

