import { FastifyPluginAsync } from 'fastify'
import {
    getSummary,
    getPerformance,
    getConversion,
    getRevenue,
    getVouchers,
    getStatus,
    getCustomAnalysis,
    getTopPerforming,
} from './controller'

type CampaignsQuery = {
    startDate?: string
    endDate?: string
}

export const campaignsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/summary', async (request, reply) => {
        return getSummary(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/performance', async (request, reply) => {
        return getPerformance(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/conversion', async (request, reply) => {
        return getConversion(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/revenue', async (request, reply) => {
        return getRevenue(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/vouchers', async (request, reply) => {
        return getVouchers(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/status', async (request, reply) => {
        return getStatus(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/custom-analysis', async (request, reply) => {
        return getCustomAnalysis(request, reply)
    })

    fastify.get<{ Querystring: CampaignsQuery }>('/api/campaigns/top-performing', async (request, reply) => {
        return getTopPerforming(request, reply)
    })
}

