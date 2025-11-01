import type { Chat } from '../api/client'

interface ChatListProps {
  chats: Chat[]
  selectedChatId: number | null
  onSelectChat: (id: number) => void
}

export default function ChatList({ chats, selectedChatId, onSelectChat }: ChatListProps) {
  const groupedChats = chats.reduce((acc, chat) => {
    if (!acc[chat.group]) {
      acc[chat.group] = []
    }
    acc[chat.group].push(chat)
    return acc
  }, {} as Record<string, Chat[]>)

  const groups = ['Content', 'Code', 'Generative'] as const

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No chats yet. Create one to get started!
      </div>
    )
  }

  return (
    <div className="py-2">
      {groups.map((group) => {
        const groupChats = groupedChats[group] || []
        if (groupChats.length === 0) return null

        return (
          <div key={group} className="mb-4">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group}
            </div>
            {groupChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors ${
                  selectedChatId === chat.id ? 'bg-gray-800 border-l-4 border-indigo-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
