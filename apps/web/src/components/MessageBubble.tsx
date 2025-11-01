import { useState } from 'react'
import type { Message } from '../api/client'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showCitations, setShowCitations] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <div className="flex-1">
            {/* Message Content */}
            <div
              className={`px-4 py-3 rounded-2xl ${
                isUser
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.final_answer || message.content}
              </div>
            </div>

            {/* Citations */}
            {!isUser && message.citations && message.citations.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowCitations(!showCitations)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showCitations ? 'Hide' : 'Show'} {message.citations.length} citation{message.citations.length > 1 ? 's' : ''}
                </button>

                {showCitations && (
                  <div className="mt-2 space-y-2">
                    {message.citations.map((citation: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          {citation.document_title}
                        </div>
                        {citation.source_url && (
                          <a
                            href={citation.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 block mb-2 truncate"
                          >
                            {citation.source_url}
                          </a>
                        )}
                        <div className="text-gray-600 line-clamp-3">
                          {citation.text}
                        </div>
                        <div className="mt-2 text-gray-500">
                          Similarity: {(citation.similarity * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className={`mt-1 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>

          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
