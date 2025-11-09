'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@brendi/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Olá! Sou o seu gestor pessoal, como posso ajudar com a Bambinella hoje?',
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

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
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: newMessages,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Failed to get response')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('No reader available')
            }

            let accumulatedText = ''
            let separatorProcessed = false
            const MESSAGE_SEPARATOR = '\n\n---MESSAGE_SEPARATOR---\n\n'

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                accumulatedText += chunk

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
        } catch (error) {
            console.error('Chat error:', error)
            setMessages((prevMessages) => {
                const updated = [...prevMessages]
                updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
                }
                return updated
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Chat Assistant</h1>
                    <p className="text-sm text-gray-500">Seu assistente útil está aqui para ajudar</p>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                    <div className="space-y-4">
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
                                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                            message.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">
                                            {message.content}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        {isLoading && messages[messages.length - 1]?.content === '' && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-lg px-4 py-2">
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

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Enviar
                    </button>
                </form>
            </main>
        </div>
    )
}
