import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import ChatList from './components/ChatList'
import ChatView from './components/ChatView'
import NewChatDialog from './components/NewChatDialog'

function App() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: chatsData } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.getChats(),
  })

  const chats = chatsData?.chats || []
  const selectedChat = chats.find((c) => c.id === selectedChatId)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } bg-gray-900 text-white flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">ZoAI Chat</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
          />
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
          <p>Powered by GPT-4o, Claude & Gemini</p>
          <p className="mt-1">Multi-Agent RAG System</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        {!sidebarOpen && (
          <div className="lg:hidden p-4 bg-white border-b">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Chat View or Welcome */}
        {selectedChat ? (
          <ChatView chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-2">
                  Welcome to ZoAI
                </h2>
                <p className="text-xl text-gray-600">
                  Multi-Agent Chat with RAG
                </p>
              </div>

              <div className="grid gap-4 text-left">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">🤖 Multi-Agent AI</h3>
                  <p className="text-sm text-gray-600">
                    Get answers from GPT-4o, Claude 3.5 Sonnet, and Gemini Pro simultaneously
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">📚 Knowledge Base</h3>
                  <p className="text-sm text-gray-600">
                    Upload URLs and documents to create your own knowledge base
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">✅ Grounded Answers</h3>
                  <p className="text-sm text-gray-600">
                    All responses are based only on your uploaded knowledge with citations
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNewChat(true)}
                className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Your First Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onChatCreated={(chatId) => {
            setSelectedChatId(chatId)
            setShowNewChat(false)
          }}
        />
      )}
    </div>
  )
}

export default App
