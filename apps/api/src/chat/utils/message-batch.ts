import type { ChatMessage } from '@brendi/types'

interface PendingBatch {
    messages: ChatMessage[]
    resolve: (messages: ChatMessage[]) => void
    timeout: NodeJS.Timeout
    conversationId: string
    lastUpdateTime: number
}

const pendingBatches = new Map<string, PendingBatch>()
const BATCH_WINDOW_MS = 2000

export function batchMessages(
    conversationId: string,
    message: ChatMessage,
    timeoutMs: number = BATCH_WINDOW_MS
): Promise<ChatMessage[]> {
    return new Promise((resolve) => {
        const existingBatch = pendingBatches.get(conversationId)
        const now = Date.now()

        if (existingBatch && now - existingBatch.lastUpdateTime < timeoutMs) {
            clearTimeout(existingBatch.timeout)
            existingBatch.messages.push(message)
            existingBatch.lastUpdateTime = now

            existingBatch.timeout = setTimeout(() => {
                const messages = [...existingBatch.messages]
                pendingBatches.delete(conversationId)
                existingBatch.resolve(messages)
            }, timeoutMs)

            pendingBatches.set(conversationId, existingBatch)
        } else {
            if (existingBatch) {
                clearTimeout(existingBatch.timeout)
                existingBatch.resolve([...existingBatch.messages])
            }

            const batch: PendingBatch = {
                messages: [message],
                resolve,
                conversationId,
                lastUpdateTime: now,
                timeout: setTimeout(() => {
                    const messages = [...batch.messages]
                    pendingBatches.delete(conversationId)
                    resolve(messages)
                }, timeoutMs),
            }

            pendingBatches.set(conversationId, batch)
        }
    })
}

export function flushBatch(conversationId: string): ChatMessage[] | null {
    const batch = pendingBatches.get(conversationId)
    if (!batch) {
        return null
    }

    clearTimeout(batch.timeout)
    const messages = [...batch.messages]
    pendingBatches.delete(conversationId)
    batch.resolve(messages)

    return messages
}

export function clearBatch(conversationId: string): void {
    const batch = pendingBatches.get(conversationId)
    if (batch) {
        clearTimeout(batch.timeout)
        pendingBatches.delete(conversationId)
    }
}

export function combineBatchedMessages(messages: ChatMessage[]): ChatMessage {
    if (messages.length === 0) {
        return { role: 'user', content: '' }
    }

    if (messages.length === 1) {
        return messages[0]
    }

    const combinedContent = messages
        .map((msg, index) => {
            if (index === 0) {
                return msg.content
            }
            return `\n\n${msg.content}`
        })
        .join('')

    return {
        role: 'user',
        content: combinedContent,
    }
}

