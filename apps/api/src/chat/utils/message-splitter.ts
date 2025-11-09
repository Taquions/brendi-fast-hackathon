import type { ChatMessage } from '@brendi/types'

const MAX_MESSAGE_LENGTH = 4000

function findBestSplitPoint(text: string, maxLength: number): number {
    if (text.length <= maxLength) {
        return text.length
    }

    const candidates = [
        text.lastIndexOf('\n\n', maxLength),
        text.lastIndexOf('\n', maxLength),
        text.lastIndexOf('. ', maxLength),
        text.lastIndexOf('! ', maxLength),
        text.lastIndexOf('? ', maxLength),
        text.lastIndexOf(', ', maxLength),
        text.lastIndexOf(' ', maxLength),
    ]

    for (const candidate of candidates) {
        if (candidate > maxLength * 0.7) {
            return candidate + 1
        }
    }

    return maxLength
}

export function splitMessage(message: ChatMessage): ChatMessage[] {
    if (message.content.length <= MAX_MESSAGE_LENGTH) {
        return [message]
    }

    const parts: ChatMessage[] = []
    let remainingContent = message.content

    while (remainingContent.length > 0) {
        if (remainingContent.length <= MAX_MESSAGE_LENGTH) {
            parts.push({
                role: message.role,
                content: remainingContent.trim(),
            })
            break
        }

        const splitPoint = findBestSplitPoint(remainingContent, MAX_MESSAGE_LENGTH)
        const partContent = remainingContent.substring(0, splitPoint).trim()
        
        if (partContent.length > 0) {
            parts.push({
                role: message.role,
                content: partContent,
            })
        }

        remainingContent = remainingContent.substring(splitPoint).trim()
    }

    return parts
}

export function splitMessages(messages: ChatMessage[]): ChatMessage[] {
    const splitMessages: ChatMessage[] = []

    for (const message of messages) {
        const parts = splitMessage(message)
        splitMessages.push(...parts)
    }

    return splitMessages
}

export function shouldSplitMessage(message: ChatMessage): boolean {
    return message.content.length > MAX_MESSAGE_LENGTH
}

