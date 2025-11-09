'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@brendi/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Olá! Sou seu gestor pessoal, como posso ajudar com a Bambinella hoje?',
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!input.trim() || isLoading) return

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim(),
        }

        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        setIsLoading(true)

        const assistantMessageIndex = newMessages.length
        setMessages([...newMessages, { role: 'assistant', content: '' }])

        try {
            console.log('Sending chat request to:', `${API_URL}/api/chat`)
            console.log('Messages:', newMessages)

            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: newMessages,
                }),
            })

            console.log('Response status:', response.status)
            console.log('Response headers:', Object.fromEntries(response.headers.entries()))

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Error response:', errorText)
                throw new Error(errorText || 'Failed to get response')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('No reader available')
            }

            let accumulatedText = ''
            let chunkCount = 0
            let separatorProcessed = false
            const MESSAGE_SEPARATOR = '\n\n---MESSAGE_SEPARATOR---\n\n'

            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    console.log('Stream completed. Total chunks:', chunkCount, 'Total length:', accumulatedText.length)
                    break
                }

                const chunk = decoder.decode(value, { stream: true })
                accumulatedText += chunk
                chunkCount++

                console.log('Chunk received:', chunkCount, 'Length:', chunk.length, 'Preview:', chunk.substring(0, 50))

                if (accumulatedText.includes(MESSAGE_SEPARATOR)) {
                    if (!separatorProcessed) {
                        separatorProcessed = true
                    }
                    const parts = accumulatedText.split(MESSAGE_SEPARATOR).map(part => part.trim()).filter(part => part.length > 0)

                    setMessages((prevMessages) => {
                        const updated = [...prevMessages]
                        updated[assistantMessageIndex] = {
                            role: 'assistant',
                            content: parts[0] || '',
                        }

                        const existingMessageCount = updated.length - assistantMessageIndex - 1
                        const newMessages = parts.slice(1).map((part) => ({
                            role: 'assistant' as const,
                            content: part,
                        }))

                        if (existingMessageCount > 0) {
                            updated.splice(assistantMessageIndex + 1, existingMessageCount, ...newMessages)
                        } else {
                            updated.push(...newMessages)
                        }

                        return updated
                    })
                } else {
                    setMessages((prevMessages) => {
                        const updated = [...prevMessages]
                        updated[assistantMessageIndex] = {
                            role: 'assistant',
                            content: accumulatedText,
                        }
                        return updated
                    })
                }
            }

            if (accumulatedText.length === 0) {
                console.warn('No content received from API')
                throw new Error('No content received from API')
            }
        } catch (error) {
            console.error('Chat error:', error)
            setMessages((prevMessages) => {
                const updated = [...prevMessages]
                updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error instanceof Error ? error.message : 'Unknown error'}. Por favor, tente novamente.`,
                }
                return updated
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
                    aria-label="Open chat"
                >
                    <svg 
                        className="w-6 h-6" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                        />
                    </svg>
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Chat Assistant</h3>
                            <p className="text-xs text-blue-100">Online</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-blue-700 rounded-full p-1 transition-colors"
                            aria-label="Close chat"
                        >
                            <svg 
                                className="w-5 h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M6 18L18 6M6 6l12 12" 
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        <div className="space-y-3">
                            {messages.map((message, index) => {
                                const isLastMessage = index === messages.length - 1
                                const isEmptyAndLoading = isLoading && isLastMessage && message.content === ''
                                
                                if (isEmptyAndLoading) {
                                    return null
                                }
                                
                                return (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            message.role === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                                message.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-900 border border-gray-200'
                                            }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            {isLoading && messages[messages.length - 1]?.content === '' && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg 
                                    className="w-5 h-5" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                                    />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

