/**
 * Web Search Service
 *
 * Provides web search fallback when no relevant context is found in the knowledge base.
 * Uses Tavily API for high-quality search results.
 *
 * To enable: Set TAVILY_API_KEY in your .env file
 * Get a free API key at: https://tavily.com
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY
const TAVILY_API_URL = 'https://api.tavily.com/search'

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface WebSearchResponse {
  query: string
  results: SearchResult[]
  answer?: string
}

/**
 * Check if web search is enabled
 */
export function isWebSearchEnabled(): boolean {
  return Boolean(TAVILY_API_KEY)
}

/**
 * Search the web using Tavily API
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured. Set TAVILY_API_KEY in your environment.')
  }

  console.log(`[Web Search] Searching for: ${query.substring(0, 100)}`)

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic', // 'basic' or 'advanced'
        include_answer: true,
        include_raw_content: false,
        max_results: maxResults,
        include_domains: [], // Optional: restrict to specific domains
        exclude_domains: [], // Optional: exclude specific domains
      }),
    })

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    const results: SearchResult[] = (data.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score || 0,
    }))

    console.log(`[Web Search] Found ${results.length} results`)

    return {
      query,
      results,
      answer: data.answer,
    }
  } catch (error) {
    console.error('[Web Search] Error:', error)
    throw error
  }
}

/**
 * Format web search results as context for AI
 */
export function formatSearchResultsForPrompt(searchResponse: WebSearchResponse): string {
  const resultsText = searchResponse.results
    .map(
      (result, index) =>
        `[Source ${index + 1}]
Title: ${result.title}
URL: ${result.url}
Content: ${result.content}
`
    )
    .join('\n\n')

  return `Web Search Results for "${searchResponse.query}":

${resultsText}

${searchResponse.answer ? `Quick Answer: ${searchResponse.answer}\n\n` : ''}Please answer the user's question based on these web search results. Include source numbers [Source 1], [Source 2], etc. in your response.`
}

/**
 * Search citations from web search results
 */
export function extractWebCitations(searchResponse: WebSearchResponse): any[] {
  return searchResponse.results.map((result, index) => ({
    source: 'web_search',
    document_id: null,
    chunk_id: null,
    url: result.url,
    title: result.title,
    similarity: result.score,
    rank: index + 1,
  }))
}
