const MESSAGE_SEPARATOR = '\n\n---MESSAGE_SEPARATOR---\n\n'

export function detectMessageParts(text: string): string[] {
    if (!text || text.trim().length === 0) {
        return []
    }

    const trimmedText = text.trim()
    
    if (trimmedText.includes(MESSAGE_SEPARATOR)) {
        return trimmedText.split(MESSAGE_SEPARATOR).map(part => part.trim()).filter(part => part.length > 0)
    }

    const doubleLineBreakPattern = /\n\s*\n/
    if (doubleLineBreakPattern.test(trimmedText)) {
        const parts = trimmedText.split(doubleLineBreakPattern).map(part => part.trim()).filter(part => part.length > 0)
        if (parts.length > 1) {
            return parts
        }
    }

    const informativeThenQuestionPattern = /([^?]+\.[^?]*)\s*\n\s*([^?]+\?[^?]*)/
    const informativeMatch = trimmedText.match(informativeThenQuestionPattern)
    if (informativeMatch && informativeMatch[1] && informativeMatch[2]) {
        const beforeQuestion = informativeMatch[1].trim()
        const afterQuestion = informativeMatch[2].trim()
        
        if (beforeQuestion.length > 20 && afterQuestion.length > 10) {
            return [beforeQuestion, afterQuestion]
        }
    }

    const questionPattern = /([^?]+\?)\s*\n\s*([^\n]+)/
    const match = trimmedText.match(questionPattern)
    if (match && match[1] && match[2]) {
        const beforeQuestion = trimmedText.substring(0, match.index! + match[1].length).trim()
        const afterQuestion = trimmedText.substring(match.index! + match[1].length).trim()
        
        if (beforeQuestion.length > 0 && afterQuestion.length > 0) {
            return [beforeQuestion, afterQuestion]
        }
    }

    const singleLineBreakWithQuestion = /([^?]+\?)\s*\n\s*([A-Z][^?]+)/
    const singleMatch = trimmedText.match(singleLineBreakWithQuestion)
    if (singleMatch && singleMatch[1] && singleMatch[2]) {
        const beforeQuestion = trimmedText.substring(0, singleMatch.index! + singleMatch[1].length).trim()
        const afterQuestion = trimmedText.substring(singleMatch.index! + singleMatch[1].length).trim()
        
        if (beforeQuestion.length > 0 && afterQuestion.length > 0 && afterQuestion.length > 10) {
            return [beforeQuestion, afterQuestion]
        }
    }

    const offerHelpPattern = /([^?]+\.[^?]*)\s*\n\s*(Se desejar|Quer que|Posso|Posso também|Deseja|Gostaria)/
    const offerMatch = trimmedText.match(offerHelpPattern)
    if (offerMatch && offerMatch[1] && offerMatch[2]) {
        const beforeOffer = trimmedText.substring(0, offerMatch.index! + offerMatch[1].length).trim()
        const afterOffer = trimmedText.substring(offerMatch.index! + offerMatch[1].length).trim()
        
        if (beforeOffer.length > 20 && afterOffer.length > 10) {
            return [beforeOffer, afterOffer]
        }
    }

    return [trimmedText]
}

export function shouldDivideMessage(text: string): boolean {
    const parts = detectMessageParts(text)
    return parts.length > 1
}

export function getMessageSeparator(): string {
    return MESSAGE_SEPARATOR
}

