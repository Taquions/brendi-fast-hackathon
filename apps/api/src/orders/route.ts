import { FastifyPluginAsync } from 'fastify'
import { getTotalOrders, getTotalRevenue, getMostOrdered, listOrders, getPaymentTypes, getDelivery, getMotoboys, getOrdersByDay } from './controller'

export const ordersRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/total', async (request, reply) => {
        return getTotalOrders(request, reply)
    })
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/revenue', async (request, reply) => {
        return getTotalRevenue(request, reply)
    })
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/most-ordered', async (request, reply) => {
        return getMostOrdered(request, reply)
    })
    fastify.get<{ Querystring: { page?: string; pageSize?: string } }>('/api/orders', async (request, reply) => {
        return listOrders(request, reply)
    })
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/payment-types', async (request, reply) => {
        return getPaymentTypes(request, reply)
    })
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/delivery', async (request, reply) => {
        return getDelivery(request, reply)
    })
    fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/api/orders/motoboys', async (request, reply) => {
        return getMotoboys(request, reply)
    })
    fastify.get('/api/orders/by-day', async (request, reply) => {
        return getOrdersByDay(request, reply)
    })
}

