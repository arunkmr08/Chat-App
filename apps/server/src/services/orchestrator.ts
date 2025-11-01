import { AgentAdapter, AgentResponse, Message } from '../agents/index.js'
import { buildRAGContext, formatContextForPrompt, hasRelevantContext } from './rag.js'
import { gpt4oAgent } from '../agents/openai.js'

export interface AgentResult {
  agentId: string
  agentLabel: string
  success: boolean
  response?: AgentResponse
  error?: string
}

export interface OrchestratorResult {
  agentResults: AgentResult[]
  synthesizedAnswer: string
  citations: any[]
  totalTokens: number
  totalLatencyMs: number
}

/**
 * Multi-Agent Orchestrator
 *
 * 1. Build RAG context from question
 * 2. Run all agents in parallel
 * 3. Collect results
 * 4. Synthesize best answer
 */
export class MultiAgentOrchestrator {
  /**
   * Run multiple agents and synthesize their responses
   */
  async orchestrate(
    chatId: number,
    question: string,
    agents: AgentAdapter[]
  ): Promise<OrchestratorResult> {
    const startTime = Date.now()

    // Step 1: Build RAG context
    console.log('[Orchestrator] Building RAG context for question:', question.substring(0, 100))

    const ragContext = await buildRAGContext(chatId, question, 12)

    // Check if we have relevant context
    if (!hasRelevantContext(ragContext, 0.3)) {
      console.log('[Orchestrator] No relevant context found')

      return {
        agentResults: [],
        synthesizedAnswer: "I don't have enough information in the knowledge base to answer that question. However, I can search the web for this information. Would you like me to do that?",
        citations: [],
        totalTokens: 0,
        totalLatencyMs: Date.now() - startTime,
      }
    }

    console.log(`[Orchestrator] Found ${ragContext.chunks.length} relevant chunks`)

    // Step 2: Format context for agents
    const contextText = formatContextForPrompt(ragContext)

    const systemPrompt = `You are a helpful AI assistant. Answer the user's question based ONLY on the provided context.

IMPORTANT RULES:
1. Use ONLY information from the context below
2. If the answer is not in the context, say: "I don't have enough information to answer that question."
3. Include citations by referring to [Document 1], [Document 2], etc.
4. Be concise and accurate
5. If sources disagree, acknowledge the disagreement

${contextText}`

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    // Step 3: Run all agents in parallel
    console.log(`[Orchestrator] Running ${agents.length} agents in parallel`)

    const agentPromises = agents.map(async (agent): Promise<AgentResult> => {
      try {
        const response = await agent.generate(messages, {
          temperature: 0.7,
          maxTokens: 1500,
        })

        console.log(`[Orchestrator] ✓ ${agent.label} responded (${response.latencyMs}ms)`)

        return {
          agentId: agent.id,
          agentLabel: agent.label,
          success: true,
          response,
        }
      } catch (error) {
        console.error(`[Orchestrator] ✗ ${agent.label} failed:`, error)

        return {
          agentId: agent.id,
          agentLabel: agent.label,
          success: false,
          error: String(error),
        }
      }
    })

    const agentResults = await Promise.all(agentPromises)

    // Filter successful results
    const successfulResults = agentResults.filter((r) => r.success && r.response)

    // Step 4: Synthesize answers
    let synthesizedAnswer: string

    if (successfulResults.length === 0) {
      synthesizedAnswer = 'All AI agents failed to respond. Please try again later.'
    } else if (successfulResults.length === 1) {
      // If only one agent responded, use its answer directly
      synthesizedAnswer = successfulResults[0].response!.text
    } else {
      // Synthesize from multiple responses
      synthesizedAnswer = await this.synthesizeResponses(
        question,
        successfulResults,
        contextText
      )
    }

    // Calculate totals
    const totalTokens = successfulResults.reduce(
      (sum, r) => sum + (r.response?.tokens.total || 0),
      0
    )

    const totalLatencyMs = Date.now() - startTime

    console.log(`[Orchestrator] Complete in ${totalLatencyMs}ms, ${totalTokens} tokens`)

    return {
      agentResults,
      synthesizedAnswer,
      citations: ragContext.citations,
      totalTokens,
      totalLatencyMs,
    }
  }

  /**
   * Synthesize multiple agent responses into one best answer
   */
  private async synthesizeResponses(
    question: string,
    results: AgentResult[],
    contextText: string
  ): Promise<string> {
    console.log('[Orchestrator] Synthesizing responses from', results.length, 'agents')

    // Build synthesis prompt
    const agentAnswers = results
      .map((r, i) => {
        return `### ${r.agentLabel} Response:\n${r.response!.text}\n`
      })
      .join('\n')

    const synthesisPrompt = `You are a synthesis agent. You have received ${results.length} different AI responses to the same question. Your job is to:

1. Compare all responses
2. Identify common themes and agreements
3. Note any disagreements or contradictions
4. Produce ONE unified, accurate answer that:
   - Combines the best parts of each response
   - Resolves contradictions if possible
   - Maintains all relevant citations
   - Is clear and well-structured

Original Question: ${question}

${agentAnswers}

Now provide a single, synthesized answer that represents the best combined response. Include citations from the original documents.`

    try {
      // Use GPT-4o for synthesis (most capable)
      const synthesisResponse = await gpt4oAgent.generate(
        [
          {
            role: 'system',
            content: 'You are an expert at synthesizing multiple AI responses into one coherent answer.',
          },
          { role: 'user', content: synthesisPrompt },
        ],
        {
          temperature: 0.5, // Lower temperature for more focused synthesis
          maxTokens: 2000,
        }
      )

      return synthesisResponse.text
    } catch (error) {
      console.error('[Orchestrator] Synthesis failed, using first response:', error)
      // Fallback to first successful response
      return results[0].response!.text
    }
  }
}

export const orchestrator = new MultiAgentOrchestrator()
