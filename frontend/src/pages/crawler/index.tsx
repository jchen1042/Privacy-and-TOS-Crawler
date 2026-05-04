import React, { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import UrlInputForm from '@/components/crawler/UrlInputForm'
import { Card, CardContent, CardHeader, CardTitle, Spinner, Button, Input } from '@/components/ui'
import { useCrawler, useCrawlerActions } from '@/store/crawlerStore'
import { useRouter } from 'next/router'
import SimpleAnalysisDisplay from '@/components/analysis/SimpleAnalysisDisplay'
import { History, ArrowRight, CheckCircle, FileText, RefreshCw, Sparkles, Download, MessageSquare, X, Send, Image as ImageIcon } from 'lucide-react' // ImageIcon is no longer used, but kept for now
import { AnalysisResult, Document, TextMiningMeasurements } from '@/types'
import { auth } from '@/lib/firebase'
import { getIdToken } from 'firebase/auth'
import { apiService } from '@/services'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { FavoriteButton } from '@/components/ui/FavoriteButton'
import NutritionLabel from '@/components/analysis/NutritionLabel'
import CrawlStatusCard from '@/components/crawler/CrawlStatusCard'
import { generateDNLOnlyPDF } from '@/utils/generateDNLOnlyPDF'

const CrawlerPage: React.FC = () => {
  const { sessions, isLoading: storeLoading } = useCrawler()
  const { getCrawlHistory } = useCrawlerActions()
  const router = useRouter()
  const [latestResults, setLatestResults] = useState<any>(null)
  const [loadingResults, setLoadingResults] = useState(false)

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeChatDoc, setActiveChatDoc] = useState<any>(null)
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<{q: string, a: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    // Get Firebase ID token and store in localStorage for API authentication
    // THEN fetch crawl history after token is set
    const setupTokenAndFetchHistory = async () => {
      if (auth.currentUser) {
        try {
          // First, get and set the token
          const token = await getIdToken(auth.currentUser)
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token)
          }
          
          // Only fetch history AFTER token is set
          // This prevents 401 errors from redirecting to login
          await getCrawlHistory()
        } catch (err) {
          console.error('Error getting token:', err)
          // Don't fetch history if token retrieval fails
        }
      }
    }
    
    setupTokenAndFetchHistory()
    
    // Also refresh token periodically (every 50 minutes)
    // And before it expires (tokens expire after 1 hour)
    const tokenRefreshInterval = setInterval(() => {
      if (auth.currentUser) {
        getIdToken(auth.currentUser, true) // Force refresh
        .then((tkn) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', tkn)
          }
        })
        .catch((err) => {
          console.error('Error refreshing token:', err)
          // If token refresh fails, try to get a new one
          if (auth.currentUser) {
            getIdToken(auth.currentUser)
              .then((tkn) => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('auth_token', tkn)
                }
              })
              .catch((refreshErr) => console.error('Error getting new token:', refreshErr))
          }
        })
      }
    }, 50 * 60 * 1000) // 50 minutes
    
    return () => clearInterval(tokenRefreshInterval)
  }, [getCrawlHistory])

  const latestSession = sessions[0]

  // Poll for updates if the latest session is still in progress
  useEffect(() => {
    const isActive = latestSession && (latestSession.status === 'processing' || latestSession.status === 'pending')
    
    let pollInterval: NodeJS.Timeout
    if (isActive) {
      pollInterval = setInterval(() => {
        getCrawlHistory()
      }, 3000)
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [latestSession?.status, getCrawlHistory])

  // Clear results if a new crawl starts to show the progress card instead
  useEffect(() => {
    if (latestSession && (latestSession.status === 'processing' || latestSession.status === 'pending')) {
      setLatestResults(null)
    }
  }, [latestSession?.id, latestSession?.status])

  const loadSessionResults = async (sessionId: string) => {
    setLoadingResults(true)
    try {
      const response = await apiService.getCrawlResults(sessionId)
      if (response.success && response.data) {
        setLatestResults(response.data)
      }
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoadingResults(false)
    }
  }

  const handleViewSession = (sessionId: string) => {
    router.push(`/crawler/results/${sessionId}`)
  }

  const handleRefresh = () => {
    // Refresh logic will be handled by the component
  }

  const handleSendChat = async () => {
    if (!chatQuestion.trim() || !activeChatDoc) return;
    
    const q = chatQuestion;
    setChatQuestion('');
    setIsTyping(true);
    
    try {
      const res = await apiService.post<{ answer: string }>(
        `/documents/${activeChatDoc.document_id}/chat`, 
        { question: q }
      );

      const answer = res.success && res.data ? res.data.answer : "I couldn't get a response from the assistant.";
      setChatHistory(prev => [...prev, { q, a: answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { q, a: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <ProtectedRoute>
      <Layout title="Analyze Documents - TOS Analyzer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Analyze Terms of Service & Privacy Policy
            </h1>
            <p className="text-gray-300">
              Enter a website URL to discover and analyze its Terms of Service and Privacy Policy documents
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Form */}
            <div className="lg:col-span-2">
              <UrlInputForm />
            </div>

            {/* Sidebar */}
            <div className="space-y-6" id="recent-activity">
              <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <History className="h-5 w-5" />
                    <span>Recent Reports Analyzed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length > 0 ? (
                    <div className="space-y-3">
                      {sessions
                        .filter(session => session && session.id && session.url) // Filter out invalid sessions
                        .slice(0, 3)
                        .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors"
                          onClick={() => handleViewSession(session.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {session.url}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No recent reports. Start analyzing to see your reports here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Load Button Section */}
          {latestSession && !latestResults && !loadingResults && (
            <div className="mt-12 max-w-2xl mx-auto">
              {latestSession.status === 'completed' ? (
                <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-300 mb-4">
                      Analysis completed! Click the button below to load the results.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => loadSessionResults(latestSession.id)}
                      leftIcon={<RefreshCw className="h-5 w-5" />}
                    >
                      Load Analysis Results
                    </Button>
                  </CardContent>
                </Card>
              ) : (latestSession.status === 'processing' || latestSession.status === 'pending') ? (
                <div className="space-y-4">
                  <div className="text-center text-gray-400 text-sm animate-pulse flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analysis in progress...</span>
                  </div>
                  <CrawlStatusCard session={latestSession} />
                </div>
              ) : null}
            </div>
          )}

          {loadingResults ? (
            <div className="mt-12">
              <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                <CardContent className="p-8 text-center">
                  <Spinner size="lg" label="Loading analysis results..." />
                  <p className="text-gray-300 mt-4">
                    Please wait while we fetch the analysis results...
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : latestResults && latestResults.documents && latestResults.documents.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between px-2 mb-6">
                <div className="flex items-center space-x-2 text-white">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <span className="text-2xl font-bold">Analysis Results</span>
                </div>
                <div className="text-sm text-gray-400">
                  {latestResults.url}
                </div>
              </div>

              <div className="space-y-8 pt-6 md:pt-10">
                {latestResults.documents.map((document: any, index: number) => {
                  const analysis = document.analysis;
                  const isSelectedForChat = activeChatDoc?.document_id === document.document_id;
                  return (
                      <div 
                        key={document.document_id || index}
                        className="p-6 md:p-10 rounded-[2.5rem] border border-gray-700/50 bg-gray-900/40 shadow-xl relative overflow-hidden"
                      >
                        {/* Subtle watermark icon for depth */}
                        <div className="absolute -top-4 -right-4 opacity-[0.02] pointer-events-none text-white">
                          <FileText size={200} />
                        </div>

                        <div className="text-[9px] font-black text-blue-500/40 uppercase tracking-[0.4em] mb-4 flex items-center gap-4">
                          <span className="flex-shrink-0">Document Entry {index + 1}</span>
                          <div className="flex-1 h-[1px] bg-gray-800" />
                        </div>

                        <div className="mb-6 pb-6 border-b border-gray-800/50">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-2">
                                {document.title || `Document ${index + 1}`}
                              </h3>
                              <p className="text-sm text-gray-400">
                                <span className="capitalize">{document.document_type}</span>
                                {document.word_count && ` • ${document.word_count.toLocaleString()} words`}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FavoriteButton
                                documentId={document.document_id}
                                initialIsFavorite={document.is_favorite || false}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/documentHistory?documentId=${document.document_id}`)}
                                leftIcon={<History className="h-4 w-4" />}
                              >
                                View History
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveChatDoc(document);
                                  setIsChatOpen(true);
                                  setChatHistory([]);
                                }}
                                className={isSelectedForChat ? 'border-blue-500 bg-blue-500/10' : ''}
                                leftIcon={<Sparkles className="h-4 w-4" />}
                              >
                                Privacy Assistant
                              </Button>
                              {analysis && analysis.nutrition_label && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const analysisResult: AnalysisResult = {
                                      document_id: document.document_id || '',
                                      summary_100: analysis.summary_100_words || '',
                                      summary_sentence: analysis.summary_one_sentence || '',
                                      word_frequency: analysis.word_frequency || {},
                                      measurements: analysis.measurements || {},
                                      created_at: analysis.created_at || new Date().toISOString(),
                                      nutrition_label: analysis.nutrition_label || {}
                                    };
                                    const docForPDF: Document = {
                                      id: document.document_id || '',
                                      url: document.url || '',
                                      domain: document.url ? new URL(document.url).hostname : '',
                                      document_type: (document.document_type === 'terms_of_service' ? 'tos' : 'privacy') as 'tos' | 'privacy',
                                      title: document.title || '',
                                      content: '',
                                      word_count: document.word_count || 0,
                                      sentence_count: analysis.measurements?.sentence_count || 0,
                                      created_at: document.created_at || new Date().toISOString(),
                                      updated_at: document.updated_at || new Date().toISOString()
                                    };
                                    generateDNLOnlyPDF({ analysis: analysisResult, document: docForPDF });
                                  }}
                                  leftIcon={<Download className="h-4 w-4" />}
                                >
                                  Download DNL (PDF)
                                </Button>
                              )}
                              {analysis && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    const analysisResult = {
                                      document_id: document.document_id || '',
                                      summary_100: analysis.summary_100_words || '',
                                      summary_sentence: analysis.summary_one_sentence || '',
                                      word_frequency: analysis.word_frequency || {},
                                      measurements: analysis.measurements || {},
                                      created_at: analysis.created_at || new Date().toISOString(),
                                      nutrition_label: analysis.nutrition_label || {}
                                    }
                                    const docForPDF = {
                                      id: document.document_id || '',
                                      url: document.url || '',
                                      domain: document.url ? new URL(document.url).hostname : '',
                                      document_type: (document.document_type === 'terms_of_service' ? 'tos' : 'privacy') as 'tos' | 'privacy',
                                      title: document.title || '',
                                      content: '',
                                      word_count: document.word_count || 0,
                                      sentence_count: analysis.measurements?.sentence_count || 0,
                                      created_at: document.created_at || new Date().toISOString(),
                                      updated_at: document.updated_at || new Date().toISOString()
                                    }
                                    generatePDFReport({
                                      analysis: analysisResult,
                                      document: docForPDF,
                                      sessionUrl: document.url
                                    })
                                  }}
                                  leftIcon={<Download className="h-4 w-4" />}
                                >
                                  Download PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {analysis && (
                          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                            <div className="xl:col-span-2">
                              <SimpleAnalysisDisplay analysis={analysis} />
                            </div>
                            <div className="xl:col-span-1">
                              <NutritionLabel data={analysis.nutrition_label || {}} />
                            </div>
                          </div>
                        )}
                      </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className={`fixed top-20 bottom-0 right-0 w-full sm:w-96 bg-gray-900 border-l border-t border-gray-700 shadow-2xl z-[2147483647] transform transition-transform duration-300 ease-in-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} rounded-tl-3xl`}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/50 rounded-tl-3xl">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-white truncate max-w-[200px]">
                  Chat: {activeChatDoc?.title || 'Document'}
                </h3>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && !isTyping && (
                <div className="text-center py-12 px-4">
                  <div className="bg-blue-500/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-400" />
                  </div>
                  <p className="text-gray-300 font-medium mb-2">Privacy Assistant Ready</p>
                  <p className="text-gray-500 text-sm">
                    Ask me anything about this document's privacy practices or terms.
                  </p>
                </div>
              )}
              
              {chatHistory.map((chat, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[85%] text-sm shadow-md">
                      {chat.q}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-800 text-gray-200 rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] text-sm border border-gray-700 shadow-sm leading-relaxed">
                      {chat.a}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-400 rounded-2xl rounded-tl-none px-4 py-2 text-sm border border-gray-700 animate-pulse">
                    AI is thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
              <div className="flex items-end space-x-2">
                <textarea
                  placeholder="Ask a question..."
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[56px] max-h-32 text-sm leading-relaxed"
                  rows={1}
                />
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleSendChat}
                  disabled={!chatQuestion.trim() || isTyping}
                  className="shrink-0 mb-1 h-10 w-10 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center uppercase tracking-tighter">
                Assistant is using AI analysis context
              </p>
            </div>
          </div>
        </div>

        {/* Backdrop */}
        {isChatOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2147483646] transition-opacity" 
            onClick={() => setIsChatOpen(false)}
          />
        )}
      </Layout>
    </ProtectedRoute>
  )
}

export default CrawlerPage