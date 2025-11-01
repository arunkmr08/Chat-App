import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

interface NewChatDialogProps {
  onClose: () => void
  onChatCreated: (chatId: number) => void
}

export default function NewChatDialog({ onClose, onChatCreated }: NewChatDialogProps) {
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState<'Content' | 'Code' | 'Generative'>('Content')
  const [selectedAgents, setSelectedAgents] = useState<number[]>([])

  const queryClient = useQueryClient()

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents(),
  })

  const createChatMutation = useMutation({
    mutationFn: (data: { title: string; group: string; agentIds: number[] }) =>
      api.createChat(data as any),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      onChatCreated(data.id)
    },
  })

  const agents = agentsData?.agents || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && selectedAgents.length > 0) {
      createChatMutation.mutate({ title, group, agentIds: selectedAgents })
    }
  }

  const toggleAgent = (agentId: number) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Chat</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., React Documentation Chat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {/* Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Content', 'Code', 'Generative'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      group === g
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Agents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select AI Agents (1-5)
              </label>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {agent.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {agent.provider} • {agent.model}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedAgents.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  Please select at least one agent
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title || selectedAgents.length === 0 || createChatMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createChatMutation.isPending ? 'Creating...' : 'Create Chat'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
