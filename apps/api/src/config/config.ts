import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

export function loadEnvironmentVariables() {
    const rootEnvPath = resolve(__dirname, '../../../../.env')
    const localEnvPath = resolve(__dirname, '../../../../.env')

    if (existsSync(rootEnvPath)) {
        config({ path: rootEnvPath })
    } else if (existsSync(localEnvPath)) {
        config({ path: localEnvPath })
    } else {
        config()
    }
}

export const env = {
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    HOST: process.env.HOST || '0.0.0.0',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY,
} as const

