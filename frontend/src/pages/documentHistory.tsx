import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, ArrowLeft, ChevronRight, FileDiff, Info, AlertCircle, History, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { documentService } from '../services/documentService';
import { DocumentVersion } from '../types/history';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, Spinner, Badge, Button, CardHeader, CardTitle } from '@/components/ui';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import DocumentDiffViewer from '@/components/analysis/DocumentDiffViewer';

const DocumentHistory: React.FC = () => {
  const router = useRouter();
  const { documentId } = router.query;
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [docInfo, setDocInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const id = Array.isArray(documentId) ? documentId[0] : documentId;
      
      // Validation check for ID
      if (!id || id === 'your-uuid-here' || id.startsWith('http')) {
        setError("Invalid or missing Document ID. Please navigate here from the Analyzer dashboard.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [info, historyData] = await Promise.all([
          documentService.getDocument(id),
          documentService.getDocumentHistory(id)
        ]);
        setDocInfo(info);
        setVersions(historyData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Could not retrieve version history. Ensure you are using a valid Document ID and are logged in.");
      } finally {
        setLoading(false);
      }
    };

    setIsMounted(true);

    const auth = getAuth();
    // Ensure auth is initialized and router is ready before attempting fetch
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (router.isReady) {
        if (user) {
          loadHistory();
        } else {
          setError("Please log in to view document history.");
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [documentId, router.isReady]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" label="Loading version history..." />
        </div>
      );
    }

    if (error) {
      return (
        <Card className="bg-red-900/10 border-red-900/30">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">History Unavailable</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={() => router.push('/crawler')} variant="outline">
              Back
            </Button>
          </CardContent>
        </Card>
      );
    }

    const handleToggleSelection = (versionId: string) => {
      setSelectedVersionIds(prev => {
        if (prev.includes(versionId)) {
          return prev.filter(id => id !== versionId);
        }
        if (prev.length >= 2) {
          return [prev[1], versionId]; // Shift selection to keep exactly two
        }
        return [...prev, versionId];
      });
    };

    const version1 = versions.find(v => v.id === selectedVersionIds[0]) || null;
    const version2 = versions.find(v => v.id === selectedVersionIds[1]) || null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors mb-6 font-medium"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <History className="h-8 w-8 text-white" />
              <h1 className="text-4xl font-bold text-white tracking-tight">Timeline of Changes</h1>
            </div>
            <p className="text-gray-300 text-lg">
              Track how this document has evolved over multiple crawls.
            </p>

            {/* Document Context Header */}
            {docInfo && (
              <Card className="mt-6 bg-gray-800/40 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-blue-400">
                      {docInfo.title || 'Untitled Document'}
                    </h2>
                    <a href={docInfo.url} target="_blank" rel="noopener noreferrer" 
                       className="text-sm text-gray-400 hover:text-blue-300 transition-colors flex items-center gap-2 w-fit">
                      <ExternalLink size={14} />
                      {docInfo.url}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comparison Selection Controls */}
          {versions.length > 1 && (
            <div className="mb-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div className="text-sm text-gray-300">
                <span className="font-bold text-blue-400">{selectedVersionIds.length}</span> of 2 versions selected. Click cards to select and compare.
              </div>
              {selectedVersionIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedVersionIds([])} className="text-gray-400 hover:text-white">
                  Clear Selection
                </Button>
              )}
            </div>
          )}

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
                  
                  <Card 
                    className={`bg-gray-800/80 backdrop-blur-sm border-gray-700 hover:border-gray-500 transition-all cursor-pointer ${
                      selectedVersionIds.includes(version.id) ? 'ring-2 ring-blue-500 border-transparent shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''
                    }`}
                    onClick={() => handleToggleSelection(version.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              selectedVersionIds.includes(version.id) 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-600 bg-gray-900/50 hover:border-gray-400'
                            }`}>
                              {selectedVersionIds.includes(version.id) && <CheckCircle size={14} className="text-white" />}
                            </div>
                          </div>
                          <div>
                          <div className="flex items-center gap-3 mb-2">
                            {isMounted && <span className="text-xl font-bold text-white">
                              {new Date(version.created_at).toLocaleDateString('en-US', { 
                                month: 'long', day: 'numeric', year: 'numeric' 
                              })}
                            </span>}
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
                      </div> </div>

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

          {/* Diff Viewer Section */}
          {versions.length > 1 && (
            <div className="mt-20 pt-12 border-t border-gray-800">
              <DocumentDiffViewer version1={version1} version2={version2} />
            </div>
          )}
        </div>
    );
  };

  return (
    <ProtectedRoute>
      <Layout title="Version History - TOS Crawler">
        {renderContent()}
      </Layout>
    </ProtectedRoute>
  );
};

export default DocumentHistory;