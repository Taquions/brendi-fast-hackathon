import type { ChatMessage } from '@brendi/types'

interface ConversationMemory {
    messages: ChatMessage[]
    lastUpdateTime: number
}

const conversationMemories = new Map<string, ConversationMemory>()
const BATCH_WINDOW_MS = 2000
const MAX_MEMORY_MESSAGES = 5

export function getConversationMemory(conversationId: string): ChatMessage[] {
    const memory = conversationMemories.get(conversationId)
    if (!memory) {
        return []
    }

    return memory.messages
}

export function addMessageToMemory(
    conversationId: string,
    message: ChatMessage
): void {
    const memory = conversationMemories.get(conversationId) || {
        messages: [],
        lastUpdateTime: Date.now(),
    }

    memory.messages.push(message)
    memory.lastUpdateTime = Date.now()

    const userMessages = memory.messages.filter((m) => m.role === 'user')
    const assistantMessages = memory.messages.filter((m) => m.role === 'assistant')

    if (userMessages.length > MAX_MEMORY_MESSAGES) {
        const excessUserMessages = userMessages.length - MAX_MEMORY_MESSAGES
        let removed = 0
        memory.messages = memory.messages.filter((m) => {
            if (m.role === 'user' && removed < excessUserMessages) {
                removed++
                return false
            }
            return true
        })
    }

    if (assistantMessages.length > MAX_MEMORY_MESSAGES) {
        const excessAssistantMessages = assistantMessages.length - MAX_MEMORY_MESSAGES
        let removed = 0
        memory.messages = memory.messages.filter((m) => {
            if (m.role === 'assistant' && removed < excessAssistantMessages) {
                removed++
                return false
            }
            return true
        })
    }

    conversationMemories.set(conversationId, memory)
}

export function getLastMessages(
    conversationId: string,
    count: number = MAX_MEMORY_MESSAGES
): ChatMessage[] {
    const memory = conversationMemories.get(conversationId)
    if (!memory) {
        return []
    }

    return memory.messages.slice(-count)
}

export function clearConversationMemory(conversationId: string): void {
    conversationMemories.delete(conversationId)
}

export function getConversationId(messages: ChatMessage[]): string {
    if (messages.length === 0) {
        return 'default'
    }

    const firstUserMessage = messages.find((m) => m.role === 'user')
    if (!firstUserMessage) {
        return 'default'
    }

    const hash = firstUserMessage.content
        .substring(0, 30)
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toLowerCase()

    return `conv_${hash}`
}

