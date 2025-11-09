import type { FastifyReply, FastifyRequest } from 'fastify'
import { getTotalOrdersCount, getTotalRevenueAmount, getMostOrderedProducts, getOrdersList, getPaymentTypesStats, getDeliveryStats, getMotoboysStats, getOrdersByDayLast30Days } from './service'

export async function getTotalOrders(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getTotalOrdersCount(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error counting orders')
        return reply.code(500).send({
            success: false,
            error: 'Failed to count orders',
        })
    }
}

export async function getTotalRevenue(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getTotalRevenueAmount(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error summing revenue')
        return reply.code(500).send({
            success: false,
            error: 'Failed to sum revenue',
        })
    }
}

export async function getMostOrdered(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getMostOrderedProducts(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting most ordered products')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get most ordered products',
        })
    }
}

export async function listOrders(request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>, reply: FastifyReply) {
    try {
        const page = parseInt(request.query.page || '1', 10)
        const pageSize = parseInt(request.query.pageSize || '50', 10)

        if (isNaN(page) || page < 1) {
            return reply.code(400).send({
                success: false,
                error: 'Invalid page parameter',
            })
        }

        if (isNaN(pageSize) || pageSize < 1 || pageSize > 200) {
            return reply.code(400).send({
                success: false,
                error: 'Invalid pageSize parameter (must be between 1 and 200)',
            })
        }

        const result = await getOrdersList(page, pageSize)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error listing orders')
        return reply.code(500).send({
            success: false,
            error: 'Failed to list orders',
        })
    }
}

export async function getPaymentTypes(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getPaymentTypesStats(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting payment types stats')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get payment types stats',
        })
    }
}

export async function getDelivery(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getDeliveryStats(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting delivery stats')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get delivery stats',
        })
    }
}

export async function getMotoboys(
    request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getMotoboysStats(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting motoboys stats')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get motoboys stats',
        })
    }
}

export async function getOrdersByDay(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const result = await getOrdersByDayLast30Days()
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting orders by day')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get orders by day',
        })
    }
}

