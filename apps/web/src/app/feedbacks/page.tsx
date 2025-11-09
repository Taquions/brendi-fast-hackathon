'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FeedbackAnalysisResponse {
  success: boolean
  data: {
    overallAverage: number
    last30Average: number
    trend: 'improving' | 'declining' | 'stable'
    negativeFeedbacks: Array<{
      id: string
      rating: number
      rated_response?: string
      created_at: string
    }>
    insights?: string
    cached?: boolean
  }
}

export default function FeedbacksPage() {
  const [analysis, setAnalysis] = useState<FeedbackAnalysisResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(true)
  const [isNegativeFeedbacksExpanded, setIsNegativeFeedbacksExpanded] = useState(true)

  useEffect(() => {
    fetchAnalysis()
  }, [])

  const fetchAnalysis = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      const url = forceRefresh 
        ? `${API_URL}/api/feedbacks/analysis?forceRefresh=true`
        : `${API_URL}/api/feedbacks/analysis`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback analysis')
      }
      
      const data: FeedbackAnalysisResponse = await response.json()
      
      if (data.success) {
        setAnalysis(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAnalysis(true)
  }

  const handleRefreshClick = () => {
    handleRefresh()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Análise de Feedbacks
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Insights e métricas de satisfação dos clientes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Atualizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar Análise
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando análise de feedbacks...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Erro ao carregar dados: {error}</p>
            <button
              onClick={() => fetchAnalysis()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : analysis ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-purple-100 uppercase tracking-wide">
                    Média Geral
                  </h3>
                  <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-4xl font-bold">
                    {analysis.overallAverage.toFixed(2)}
                  </p>
                  <div className="flex">
                    {renderStars(Math.round(analysis.overallAverage))}
                  </div>
                </div>
                <p className="text-purple-100 text-sm">
                  média de todas as avaliações
                </p>
              </div>

              <div className={`rounded-lg shadow-lg p-6 text-white ${
                analysis.trend === 'improving' 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  : analysis.trend === 'declining'
                  ? 'bg-gradient-to-br from-red-500 to-red-600'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-medium uppercase tracking-wide ${
                    analysis.trend === 'improving' 
                      ? 'text-emerald-100'
                      : analysis.trend === 'declining'
                      ? 'text-red-100'
                      : 'text-gray-100'
                  }`}>
                    Últimas 30 Avaliações
                  </h3>
                  {analysis.trend === 'improving' ? (
                    <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : analysis.trend === 'declining' ? (
                    <svg className="w-8 h-8 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-4xl font-bold">
                    {analysis.last30Average.toFixed(2)}
                  </p>
                  <div className="flex">
                    {renderStars(Math.round(analysis.last30Average))}
                  </div>
                </div>
                {analysis.trend === 'improving' && (
                  <div className="mt-4 bg-emerald-400/30 rounded-lg p-3">
                    <p className="text-emerald-50 font-semibold text-sm">
                      🎉 Melhorando! A média das últimas avaliações está acima da média geral.
                    </p>
                  </div>
                )}
                {analysis.trend === 'declining' && (
                  <div className="mt-4 bg-red-400/30 rounded-lg p-3">
                    <p className="text-red-50 font-semibold text-sm">
                      ⚠️ Atenção! A média das últimas avaliações está abaixo da média geral.
                    </p>
                  </div>
                )}
                {analysis.trend === 'stable' && (
                  <p className="text-gray-100 text-sm mt-2">
                    mantendo estabilidade
                  </p>
                )}
              </div>
            </div>

            {analysis.insights && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Insights de Reclamações
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                    >
                      {isInsightsExpanded ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Reduzir
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Expandir
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {isInsightsExpanded && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {analysis.insights}
                    </p>
                  </div>
                )}
              </div>
            )}

            {analysis.negativeFeedbacks.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Feedbacks Negativos ({analysis.negativeFeedbacks.length})
                  </h2>
                  <button
                    onClick={() => setIsNegativeFeedbacksExpanded(!isNegativeFeedbacksExpanded)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                  >
                    {isNegativeFeedbacksExpanded ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Reduzir
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Expandir
                      </>
                    )}
                  </button>
                </div>
                {isNegativeFeedbacksExpanded && (
                  <div className="space-y-4">
                    {analysis.negativeFeedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {renderStars(feedback.rating)}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(feedback.created_at)}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            feedback.rating === 1 
                              ? 'bg-red-100 text-red-800'
                              : feedback.rating === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            Nota {feedback.rating}
                          </span>
                        </div>
                        {feedback.rated_response && (
                          <p className="text-gray-700 mt-2">
                            {feedback.rated_response}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {analysis.negativeFeedbacks.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Nenhum feedback negativo!
                </h2>
                <p className="text-gray-600">
                  Todos os feedbacks recentes têm avaliação igual ou superior a 3.
                </p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}

