import type { ChatRequest } from '@brendi/types'

export interface ChatValidationResult {
    isValid: boolean
    error?: string
}

export function validateChatRequest(body: unknown): ChatValidationResult {
    if (!body || typeof body !== 'object') {
        return {
            isValid: false,
            error: 'Request body is required',
        }
    }

    const request = body as ChatRequest

    if (!request.messages) {
        return {
            isValid: false,
            error: 'Messages array is required',
        }
    }

    if (!Array.isArray(request.messages)) {
        return {
            isValid: false,
            error: 'Messages must be an array',
        }
    }

    if (request.messages.length === 0) {
        return {
            isValid: false,
            error: 'Messages array cannot be empty',
        }
    }

    for (const message of request.messages) {
        if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
            return {
                isValid: false,
                error: 'Each message must have a valid role (user, assistant, or system)',
            }
        }

        if (!message.content || typeof message.content !== 'string') {
            return {
                isValid: false,
                error: 'Each message must have a valid content string',
            }
        }
    }

    return { isValid: true }
}

