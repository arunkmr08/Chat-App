import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

interface SourceManagerProps {
  chatId: number
}

export default function SourceManager({ chatId }: SourceManagerProps) {
  const [urls, setUrls] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const queryClient = useQueryClient()

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ['sources', chatId],
    queryFn: () => api.getSources(chatId),
    refetchInterval: 3000, // Poll every 3 seconds for status updates
  })

  const addSourcesMutation = useMutation({
    mutationFn: (urlList: string[]) => api.addSources(chatId, urlList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', chatId] })
      setUrls('')
      setIsAdding(false)
    },
  })

  const sources = sourcesData?.sources || []

  const handleAddSources = () => {
    const urlList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urlList.length > 0) {
      addSourcesMutation.mutate(urlList)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'queued':
        return 'bg-yellow-100 text-yellow-800'
      case 'parsing':
      case 'embedding':
        return 'bg-blue-100 text-blue-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'queued':
      case 'parsing':
      case 'embedding':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge Sources</h3>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              + Add URLs
            </button>
          )}
        </div>

        {/* Add URLs Form */}
        {isAdding && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add URLs (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com/article1&#10;https://example.com/article2"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddSources}
                disabled={!urls.trim() || addSourcesMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {addSourcesMutation.isPending ? 'Adding...' : 'Add Sources'}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setUrls('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading sources...</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No sources yet. Add some URLs to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <a
                          href={source.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate block"
                        >
                          {source.url || source.file_name}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {new Date(source.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          source.status
                        )}`}
                      >
                        {getStatusIcon(source.status)}
                        {source.status}
                      </span>
                    </div>
                    {source.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        Error: {source.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
