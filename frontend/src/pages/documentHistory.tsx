import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, ArrowLeft, ChevronRight, FileDiff, Info, AlertCircle, History } from 'lucide-react';
import { documentService } from '../services/documentService';
import { DocumentVersion } from '../types/history';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, Spinner, Badge } from '@/components/ui';

const DocumentHistory: React.FC = () => {
  const router = useRouter();
  const { documentId } = router.query;
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!documentId) return;
      try {
        const data = await documentService.getDocumentHistory(documentId as string);
        setVersions(data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    if (router.isReady) loadHistory();
  }, [documentId, router.isReady]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout title="Version History - TOS Crawler">
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" label="Loading version history..." />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout title="Version History - TOS Crawler">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.push('/crawler')}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors mb-6 font-medium"
            >
              <ArrowLeft size={18} />
              <span>Back to Analyzer</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <History className="h-8 w-8 text-white" />
              <h1 className="text-4xl font-bold text-white tracking-tight">Timeline of Changes</h1>
            </div>
            <p className="text-gray-300 text-lg">
              Track how this document has evolved over multiple crawls.
            </p>
          </div>

          <div className="relative border-l-2 border-gray-700 ml-4 pl-8 space-y-12">
            {versions.length === 0 ? (
              <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                <CardContent className="p-8 text-center text-gray-400 italic">
                  No historical records found for this document.
                </CardContent>
              </Card>
            ) : (
              versions.map((version, index) => (
                <div key={version.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-11 mt-1.5 w-6 h-6 rounded-full border-4 border-gray-900 shadow-sm ${
                    index === 0 ? 'bg-green-500 ring-4 ring-green-500/20' : 'bg-blue-500'
                  }`} />
                  
                  <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 hover:border-gray-600 transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl font-bold text-white">
                              {new Date(version.created_at).toLocaleDateString('en-US', { 
                                month: 'long', day: 'numeric', year: 'numeric' 
                              })}
                            </span>
                            {index === 0 && (
                              <Badge variant="success">Current</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-mono bg-gray-900/50 px-2 py-1 rounded">
                            Hash: {version.text_hash.substring(0, 16)}
                          </span>
                        </div>
                        <div className="text-right bg-gray-900/50 p-2 rounded-lg px-4 border border-gray-700">
                          <div className="text-sm font-bold text-gray-200">{version.word_count.toLocaleString()} words</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Document Size</div>
                        </div>
                      </div>

                      {/* Change Analysis Highlight */}
                      {version.change_description ? (
                        <div className="p-4 bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                          <h4 className="flex items-center gap-2 text-xs font-black text-blue-400 mb-2 uppercase tracking-widest">
                            <FileDiff size={14} /> AI Change Analysis
                          </h4>
                          <p className="text-sm text-gray-200 leading-relaxed font-medium">
                            {version.change_description}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-900/30 border-l-4 border-gray-600 rounded-r-lg">
                          <p className="text-sm text-gray-400 italic">
                            Initial baseline version. Changes will be tracked relative to this point in the future.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default DocumentHistory;