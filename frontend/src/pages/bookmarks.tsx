import React, { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Card, CardContent, Spinner } from '@/components/ui'
import { Bookmark, ExternalLink, Trash2, Search, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { apiService } from '@/services'
import { FavoriteDocument } from '@/types'
import toast from 'react-hot-toast'

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<FavoriteDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBookmarks()
  }, [])

  const loadBookmarks = async () => {
    setIsLoading(true)
    try {
      // Provide default pagination parameters
      const response = await apiService.getFavorites({ page: 1, limit: 10 })
      if (response.success && response.data?.documents) {
        setBookmarks(response.data.documents)
      } else {
        setError(response.error?.message || 'Failed to load bookmarks')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading bookmarks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBookmark = async (favoriteId: string, documentId: string) => {
    if (confirm('Are you sure you want to remove this bookmark?')) {
      try {
        // The API now expects the document_id pointer to find the global link
        const response = await apiService.removeFromFavorites(documentId)
        if (response.success) {
          setBookmarks(prev => prev.filter(b => b.id !== favoriteId))
          toast.success('Bookmark removed successfully!')
        } else {
          toast.error(response.error?.message || 'Failed to remove bookmark.')
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred while removing bookmark.')
      }
    }
  }

  return (
    <ProtectedRoute>
      <Layout title="Bookmarks - TOS Analyzer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-gray-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">My Bookmarks</h1>
                <p className="text-gray-300 mt-1">
                  Saved documents and analyses for quick access
                </p>
              </div>
            </div>
          </div>

          {/* Bookmarks List */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" label="Loading bookmarks..." />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-12 text-center text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Error Loading Bookmarks</h3>
                <p className="text-gray-400">{error}</p>
              </CardContent>
            </Card>
          ) : bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.map((bookmark) => (
                <Card key={bookmark.id} className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2 truncate">
                          {bookmark.title || bookmark.url}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                          {bookmark.summary || bookmark.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{new Date(bookmark.created_at).toLocaleDateString()}</span>
                          {bookmark.document_type && (
                            <span className="px-2 py-1 bg-gray-800 rounded text-gray-300">
                              {bookmark.document_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteBookmark(bookmark.id, bookmark.document_id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors ml-2">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex space-x-2 pt-4 border-t border-gray-700">
                      {bookmark.session_id ? (
                        <Link
                          href={`/crawler/results/${bookmark.session_id}`}
                          className="flex-1 btn-outline py-2 text-center text-sm flex items-center justify-center"
                        >
                          View Analysis
                        </Link>
                      ) : (
                        <Link
                          href={`/documentHistory?documentId=${bookmark.document_id}`}
                          className="flex-1 btn-outline py-2 text-center text-sm flex items-center justify-center"
                        >
                          View History
                        </Link>
                      )}
                      {bookmark.url && (
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Bookmarks Yet</h3>
                <p className="text-gray-400 mb-6">
                  Start analyzing documents and bookmark your favorites for quick access
                </p>
                <Link href="/crawler">
                  <button className="btn-primary px-6 py-3">
                    Start Analyzing
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

export default BookmarksPage
