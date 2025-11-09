import type { FastifyReply, FastifyRequest } from 'fastify'
import {
    getCampaignsSummary,
    getPerformanceByTargeting,
    getConversionAnalysis,
    getRevenueAnalysis,
    getVoucherAnalysis,
    getCampaignStatusDistribution,
    getCustomCampaignsAnalysis,
    getTopPerformingCampaigns,
} from './service'

type CampaignsQuery = {
    startDate?: string
    endDate?: string
}

export async function getSummary(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getCampaignsSummary(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting campaigns summary')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get campaigns summary',
        })
    }
}

export async function getPerformance(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getPerformanceByTargeting(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting campaigns performance')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get campaigns performance',
        })
    }
}

export async function getConversion(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getConversionAnalysis(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting conversion analysis')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get conversion analysis',
        })
    }
}

export async function getRevenue(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getRevenueAnalysis(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting revenue analysis')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get revenue analysis',
        })
    }
}

export async function getVouchers(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getVoucherAnalysis(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting voucher analysis')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get voucher analysis',
        })
    }
}

export async function getStatus(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getCampaignStatusDistribution(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting campaign status distribution')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get campaign status distribution',
        })
    }
}

export async function getCustomAnalysis(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getCustomCampaignsAnalysis(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting custom campaigns analysis')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get custom campaigns analysis',
        })
    }
}

export async function getTopPerforming(
    request: FastifyRequest<{ Querystring: CampaignsQuery }>,
    reply: FastifyReply
) {
    try {
        const { startDate, endDate } = request.query || {}
        const result = await getTopPerformingCampaigns(startDate, endDate)
        return reply.code(200).send({
            success: true,
            data: result,
        })
    } catch (error) {
        request.log.error(error, 'Error getting top performing campaigns')
        return reply.code(500).send({
            success: false,
            error: 'Failed to get top performing campaigns',
        })
    }
}

