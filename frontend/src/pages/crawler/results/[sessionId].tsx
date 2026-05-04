import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import CrawlStatusCard from '@/components/crawler/CrawlStatusCard'
import SimpleAnalysisDisplay from '@/components/analysis/SimpleAnalysisDisplay'
import { Card, CardContent, CardHeader, CardTitle, Spinner, Button, Input } from '@/components/ui'
import { useCrawler } from '@/store/crawlerStore'
import { CrawlSession, AnalysisResult, Document, TextMiningMeasurements } from '@/types'
import { ArrowLeft, RefreshCw, FileText, Download, History, MessageSquare, Send, X, Sparkles, Filter } from 'lucide-react'
import { apiService } from '@/services'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { FavoriteButton } from '@/components/ui/FavoriteButton'
import NutritionLabel from '@/components/analysis/NutritionLabel'
import { generateDNLOnlyPDF } from '@/utils/generateDNLOnlyPDF'

const CrawlResultsPage: React.FC = () => {
  const router = useRouter()
  const { sessionId } = router.query
  const { sessions } = useCrawler()
  
  const [session, setSession] = useState<CrawlSession | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Document Filtering State
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('all')

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeChatDoc, setActiveChatDoc] = useState<any>(null)
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<{q: string, a: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (sessionId && typeof sessionId === 'string') {
      // Validate UUID format before making request
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(sessionId)) {
        loadSessionData(sessionId)
      } else {
        console.error('Invalid session ID format:', sessionId)
        setError(`Invalid session ID format: ${sessionId}`)
        setIsLoading(false)
      }
    }
  }, [sessionId])

  const loadSessionData = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSelectedDocumentId('all') // Reset filter on new load
      
      console.log('Loading session data for ID:', id) // Debug log

      // Fetch from API
      const response = await apiService.getCrawlResults(id)
      
      console.log('Session response:', response) // Debug log
      
      if (response.success && response.data) {
        const sessionData = response.data
        
        // Map backend response to frontend format
        const mappedSession: CrawlSession = {
          id: sessionData.session_id,
          user_id: 'current-user',
          url: sessionData.url,
          document_types: [],
          status: sessionData.status,
          progress: sessionData.analyzed_count / Math.max(sessionData.document_count, 1),
          documents_found: sessionData.document_count,
          documents_analyzed: sessionData.analyzed_count,
          created_at: sessionData.created_at
        }
        
        setSession(mappedSession)
        
        // Extract documents and analyses
        const docs = sessionData.documents || []
        setDocuments(docs)
        
        // Extract analyses
        const analysisList = docs
          .filter((doc: any) => doc.analysis)
          .map((doc: any) => ({
            ...doc.analysis,
            document_id: doc.document_id
          }))
        setAnalyses(analysisList)
        
      } else {
        setError(response.error?.message || 'Failed to load session')
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (sessionId && typeof sessionId === 'string') {
      loadSessionData(sessionId)
    }
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

  // Filter documents based on dropdown selection
  const filteredDocuments = selectedDocumentId === 'all' 
    ? documents 
    : documents.filter(doc => doc.document_id === selectedDocumentId);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout title="Loading Results - TOS Crawler">
          <div className="min-h-screen flex items-center justify-center">
            <Spinner size="lg" label="Loading analysis results..." />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (error || !session) {
    return (
      <ProtectedRoute>
        <Layout title="Error - TOS Crawler">
          <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              {error || 'Session not found'}
            </h1>
            <p className="text-gray-300 mb-6">
              The requested analysis session could not be found or loaded.
            </p>
            <button
              onClick={() => router.push('/crawler')}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Back to Analyzer
            </button>
          </div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout title="Analysis Results - TOS Crawler">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2">
              Analysis Results
            </h1>
            <p className="text-gray-300">
              Results for {session.url}
            </p>
          </div>

          <div className="mb-12 p-6 rounded-2xl bg-blue-900/10 border border-blue-500/20 shadow-xl shadow-blue-500/5 backdrop-blur-sm">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Session Overview
            </div>
            <CrawlStatusCard session={session} />
          </div>

          {/* Dynamic Document Filter Navigation */}
          {session.status === 'completed' && documents?.length > 1 && (
            <div className="flex items-center space-x-2 mb-8 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700/50 w-fit overflow-x-auto">
              <div className="pl-2 pr-1 text-gray-500 hidden sm:block">
                <Filter className="h-4 w-4" />
              </div>
              <Button
                variant={selectedDocumentId === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedDocumentId('all')}
                className={`whitespace-nowrap ${selectedDocumentId === 'all' ? '' : 'text-gray-400 hover:text-white'}`}
              >
                All Documents ({documents.length})
              </Button>
              
              {documents.map((doc, index) => (
                <Button
                  key={doc.document_id || index}
                  variant={selectedDocumentId === doc.document_id ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedDocumentId(doc.document_id)}
                  className={`whitespace-nowrap ${selectedDocumentId === doc.document_id ? '' : 'text-gray-400 hover:text-white'}`}
                >
                  {doc.title || `Document ${index + 1}`}
                </Button>
              ))}
            </div>
          )}

          {session.status === 'completed' && documents?.length > 0 ? (
            filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-900/40 rounded-[2.5rem] border border-gray-700/50">
                <p>No documents found matching this filter.</p>
                <Button 
                  variant="ghost" 
                  className="mt-4 text-blue-400 hover:text-blue-300"
                  onClick={() => setSelectedDocumentId('all')}
                >
                  Clear Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-24">
                {filteredDocuments.map((document, index) => {
                  const analysis = document.analysis
                  const isSelectedForChat = activeChatDoc?.document_id === document.document_id;
                  
                  // Keep the original index label based on the full documents array
                  const originalIndex = documents.findIndex(d => d.document_id === document.document_id);
                  const displayIndex = originalIndex !== -1 ? originalIndex + 1 : index + 1;

                  return (
                    <div 
                      key={document.document_id || index}
                      className="p-8 md:p-12 rounded-[3rem] border border-gray-800 bg-gray-900/30 shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none text-white">
                        <FileText size={240} />
                      </div>
                      
                      <div className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.4em] mb-10 flex items-center gap-6">
                        <span className="flex-shrink-0">Document Entry {displayIndex}</span>
                        <div className="flex-1 h-[1px] bg-gray-800" />
                      </div>

                      <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700/50 shadow-xl mb-8">
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div>
                              <h2 className="text-2xl font-bold text-white mb-2">
                                {document.title || 'Document ' + displayIndex}
                              </h2>
                              <p className="text-gray-300">
                                <span className="inline-flex items-center space-x-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="capitalize">{document.document_type}</span>
                                </span>
                                {' • '}
                                <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                                  {document.url}
                                </a>
                              </p>
                              {document.word_count && (
                                <p className="text-sm text-gray-400 mt-1">
                                  Word count: {document.word_count.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
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
                        </CardContent>
                      </Card>
                      
                      {analysis ? (
                        <div className="mt-8">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-2 w-full">
                              <SimpleAnalysisDisplay analysis={analysis} />
                            </div>
                            <div className="lg:col-span-1 w-full">
                              <NutritionLabel 
                                data={analysis.nutrition_label || {}} 
                                onDownload={analysis.nutrition_label ? () => {
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
                                } : undefined}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                          <CardContent className="p-8 text-center">
                            <p className="text-gray-300">No analysis available for this document.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : session.status === 'processing' ? (
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
              <CardContent className="p-8 text-center">
                <Spinner size="lg" label="Processing documents..." />
                <p className="text-gray-300 mt-4">
                  This may take a few minutes. The page will update automatically.
                </p>
              </CardContent>
            </Card>
          ) : session.status === 'failed' ? (
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Analysis Failed
                </h3>
                <p className="text-gray-300 mb-4">
                  {session.error_message || 'An error occurred during analysis.'}
                </p>
                <button
                  onClick={() => router.push('/crawler')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Try Again
                 Back to Analyzer
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
              <CardContent className="p-8 text-center">
                <Spinner size="lg" label="Starting analysis..." />
                <p className="text-gray-300 mt-4">
                  Initializing document analysis...
                </p>
              </CardContent>
              </Card>
          )}
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

export default CrawlResultsPage