import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal server error'

    request.log.error(
        {
            err: error,
            statusCode,
            message,
            url: request.url,
            method: request.method,
        },
        'Request error'
    )

    reply.status(statusCode).send({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    })
}

