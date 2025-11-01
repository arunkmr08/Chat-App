import { AgentAdapter } from './base.js'
import { gpt4oAgent, gpt4oMiniAgent } from './openai.js'
import { claude35SonnetAgent } from './anthropic.js'
import { geminiProAgent, geminiFlashAgent } from './google.js'

/**
 * Registry of all available agents
 */
export const agentRegistry = new Map<string, AgentAdapter>([
  ['openai:gpt-4o', gpt4oAgent],
  ['openai:gpt-4o-mini', gpt4oMiniAgent],
  ['anthropic:claude-3-5-sonnet-20241022', claude35SonnetAgent],
  ['google:gemini-1.5-pro', geminiProAgent],
  ['google:gemini-1.5-flash', geminiFlashAgent],
])

/**
 * Get agent by database agent record
 */
export function getAgentByKey(key: string): AgentAdapter | undefined {
  // Map database keys to agent instances
  const keyMapping: Record<string, string> = {
    'openai-gpt4o': 'openai:gpt-4o',
    'openai-gpt4o-mini': 'openai:gpt-4o-mini',
    'anthropic-claude-3.5-sonnet': 'anthropic:claude-3-5-sonnet-20241022',
    'google-gemini-pro': 'google:gemini-1.5-pro',
    'google-gemini-flash': 'google:gemini-1.5-flash',
  }

  const registryKey = keyMapping[key] || key
  return agentRegistry.get(registryKey)
}

/**
 * Get agents by database IDs
 */
export async function getAgentsByIds(agentIds: number[]): Promise<AgentAdapter[]> {
  const { query } = await import('../lib/db.js')

  const result = await query<{ id: number; key: string }>(
    'SELECT id, key FROM agents WHERE id = ANY($1) AND enabled = true',
    [agentIds]
  )

  const agents: AgentAdapter[] = []

  for (const row of result.rows) {
    const agent = getAgentByKey(row.key)
    if (agent) {
      agents.push(agent)
    }
  }

  return agents
}

// Export agents
export { gpt4oAgent, gpt4oMiniAgent, claude35SonnetAgent, geminiProAgent, geminiFlashAgent }
export type { AgentAdapter, AgentResponse, Message } from './base.js'
