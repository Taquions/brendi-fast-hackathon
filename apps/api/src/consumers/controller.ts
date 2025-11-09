import type { FastifyReply, FastifyRequest } from 'fastify'
import { getConsumersStats, getNewConsumers, getNewConsumersWithZeroOrders } from './service'

export async function getConsumers(
    request: FastifyRequest<{ Querystring: { limit?: string; startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { limit: limitParam, startDate, endDate } = request.query || {}
        const limit = limitParam ? parseInt(limitParam, 10) : 10

        if (isNaN(limit) || limit < 1 || limit > 100) {
            return reply.code(400).send({
                success: false,
                error: 'Invalid limit parameter (must be between 1 and 100)',
            })
        }

        const result = await getConsumersStats(limit, startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting consumers stats')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get consumers stats',
        })
    }
}

export async function getNewConsumersController(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getNewConsumers(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting new consumers')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get new consumers',
        })
    }
}

export async function getNewConsumersWithZeroOrdersController(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getNewConsumersWithZeroOrders(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting new consumers with zero orders')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get new consumers with zero orders',
        })
    }
}

