import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { ChatMessage } from '@brendi/types'
import { analyzeApisTool, restaurantManagerSystemPrompt } from './utils/agent'
import {
    getConversationMemory,
    addMessageToMemory,
    getConversationId,
} from './utils/chat-memory'
import {
    batchMessages,
    flushBatch,
    combineBatchedMessages,
} from './utils/message-batch'

export interface ChatServiceConfig {
    openAiKey?: string
    systemMessage?: string
    temperature?: number
}

export interface ResolvedChatConfig {
    openAiKey?: string
    systemMessage: string
    temperature: number
}

export interface ApiKeyValidationResult {
    isValid: boolean
    error?: string
}

export function resolveChatConfig(config: ChatServiceConfig = {}): ResolvedChatConfig {
    return {
        openAiKey: config.openAiKey || process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY,
        systemMessage: restaurantManagerSystemPrompt,
        temperature: 0,
    }
}

export function validateApiKeys(config: ChatServiceConfig = {}): ApiKeyValidationResult {
    const resolved = resolveChatConfig(config)
    if (!resolved.openAiKey) {
        return {
            isValid: false,
            error: 'Missing OPENAI_API_KEY',
        }
    }
    return { isValid: true }
}

export interface StreamChatResponseResult {
    textStream: AsyncIterable<string>
    conversationId: string
    saveResponse: (response: string) => void
}

export async function streamChatResponse(
    messages: ChatMessage[],
    config: ChatServiceConfig = {}
): Promise<StreamChatResponseResult> {
    const resolved = resolveChatConfig(config)
    if (resolved.openAiKey) {
        process.env.OPENAI_API_KEY = resolved.openAiKey
    }

    const conversationId = getConversationId(messages)
    const memoryMessages = getConversationMemory(conversationId)

    const lastMessage = messages[messages.length - 1]
    let processedMessages: ChatMessage[] = messages

    if (lastMessage && lastMessage.role === 'user') {
        const batchedMessages = await Promise.race([
            batchMessages(conversationId, lastMessage, 500),
            new Promise<ChatMessage[]>((resolve) =>
                setTimeout(() => resolve([lastMessage]), 100)
            ),
        ])

        if (batchedMessages.length > 1) {
            const combinedMessage = combineBatchedMessages(batchedMessages)
            processedMessages = [
                ...messages.slice(0, -1),
                combinedMessage,
            ]
            addMessageToMemory(conversationId, combinedMessage)
        } else {
            addMessageToMemory(conversationId, lastMessage)
        }
    }

    const combinedMessages = [...memoryMessages, ...processedMessages]

    const tools = { analyzeApisTool }

    const result = streamText({
        model: openai('gpt-4.1-mini'),
        system: resolved.systemMessage,
        messages: combinedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        })),
        toolChoice: 'auto',
        tools,
        prepareStep: ({ stepNumber }: { stepNumber: number }) => {
            if (stepNumber === 0) {
                return { toolChoice: 'required', tools, maxRetries: 3 }
            }
        },
        maxRetries: 3,
        stopWhen: ({ steps }: { steps: any[] }) => {
            return steps.some((step) => step.toolCalls?.length > 2)
        },
        temperature: resolved.temperature,
    })

    return {
        textStream: result.textStream,
        conversationId,
        saveResponse: (response: string) => {
            if (response) {
                addMessageToMemory(conversationId, {
                    role: 'assistant',
                    content: response,
                })
            }
        },
    }
}

export async function getChatResponse(
    messages: ChatMessage[],
    config: ChatServiceConfig = {}
): Promise<string> {
    const resolved = resolveChatConfig(config)
    if (resolved.openAiKey) {
        process.env.OPENAI_API_KEY = resolved.openAiKey
    }

    const conversationId = getConversationId(messages)
    const lastMessage = messages[messages.length - 1]

    let processedMessages: ChatMessage[] = messages

    if (lastMessage && lastMessage.role === 'user') {
        const batchedMessages = await batchMessages(conversationId, lastMessage)

        if (batchedMessages.length > 1) {
            const combinedMessage = combineBatchedMessages(batchedMessages)
            processedMessages = [
                ...messages.slice(0, -1),
                combinedMessage,
            ]
            addMessageToMemory(conversationId, combinedMessage)
        } else {
            addMessageToMemory(conversationId, lastMessage)
        }
    }

    const memoryMessages = getConversationMemory(conversationId)
    const combinedMessages = [...memoryMessages, ...processedMessages]

    const result = streamText({
        model: openai('gpt-4.1-mini'),
        system: resolved.systemMessage,
        messages: combinedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        })),
        temperature: resolved.temperature,
    })

    let fullText = ''
    for await (const delta of result.textStream) {
        fullText += delta
    }

    if (fullText) {
        addMessageToMemory(conversationId, {
            role: 'assistant',
            content: fullText,
        })
    }

    return fullText
}

