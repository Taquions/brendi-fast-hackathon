import Fastify from 'fastify'
import cors from '@fastify/cors'
import { loadEnvironmentVariables, env } from './config/config'
import { chatRoutes } from './chat/route'
import { ordersRoutes } from './orders/route'
import { feedbacksRoutes } from './feedbacks/route'
import { storeRoutes } from './stores/route'
import { consumerPreferencesRoutes } from './consumer-preferences/route'
import { consumersRoutes } from './consumers/route'
import { menuEventsRoutes } from './menu/route'
import { campaignsRoutes } from './campaigns/route'
import { errorHandler } from './middlewares/error-handler'

loadEnvironmentVariables()

async function buildServer() {
    const fastify = Fastify({
        logger: {
            level: env.LOG_LEVEL,
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        },
    })

    fastify.setErrorHandler(errorHandler)

    await fastify.register(cors, {
        origin: env.CORS_ORIGIN,
        credentials: true,
    })

    fastify.register(chatRoutes)
    fastify.register(ordersRoutes)
    fastify.register(feedbacksRoutes)
    fastify.register(storeRoutes)
    fastify.register(consumerPreferencesRoutes)
    fastify.register(consumersRoutes)
    fastify.register(menuEventsRoutes)
    fastify.register(campaignsRoutes)

    return fastify
}

async function start() {
    try {
        const fastify = await buildServer()

        await fastify.listen({ port: env.PORT, host: env.HOST })

        console.log(`🚀 API server running on http://${env.HOST}:${env.PORT}`)
    } catch (err) {
        console.error('Error starting server:', err)
        process.exit(1)
    }
}

start()

