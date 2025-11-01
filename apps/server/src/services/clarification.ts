import { gpt4oAgent } from '../agents/openai.js'

/**
 * Clarification Service
 * Detects ambiguous questions and generates clarifying questions
 */

export interface ClarificationResult {
  needsClarification: boolean
  clarityScore: number
  questions: string[]
  reasoning: string
}

/**
 * Analyze a question for ambiguity and generate clarifying questions
 */
export async function analyzeClarification(question: string): Promise<ClarificationResult> {
  const prompt = `Analyze this question for ambiguity and clarity:

"${question}"

Determine:
1. Is this question clear and specific? (0-1 score)
2. What information is missing or ambiguous?
3. What clarifying questions would help answer this better?

Respond in JSON format:
{
  "clarityScore": 0.0-1.0,
  "needsClarification": boolean,
  "missingInfo": ["item1", "item2"],
  "clarifyingQuestions": ["question1?", "question2?"],
  "reasoning": "explanation"
}

A clarity score above 0.7 means the question is clear enough to answer.
A score below 0.7 means clarification would help.`

  try {
    const response = await gpt4oAgent.generate(
      [
        {
          role: 'system',
          content: 'You are an expert at analyzing question clarity and generating helpful clarifying questions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.3,
        maxTokens: 500,
      }
    )

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse clarification response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      needsClarification: parsed.needsClarification || parsed.clarityScore < 0.7,
      clarityScore: parsed.clarityScore || 0.5,
      questions: parsed.clarifyingQuestions || [],
      reasoning: parsed.reasoning || 'Unable to analyze question clarity',
    }
  } catch (error) {
    console.error('[Clarification] Analysis failed:', error)

    // Fallback: Simple heuristic-based analysis
    return simpleAnalysis(question)
  }
}

/**
 * Simple heuristic-based clarification analysis (fallback)
 */
function simpleAnalysis(question: string): ClarificationResult {
  const questions: string[] = []
  let clarityScore = 1.0

  // Check for vague pronouns
  if (/\b(it|this|that|they|them)\b/i.test(question)) {
    questions.push('What specifically are you referring to?')
    clarityScore -= 0.2
  }

  // Check for missing context
  if (question.length < 20) {
    questions.push('Could you provide more context or details?')
    clarityScore -= 0.2
  }

  // Check for multiple topics
  if (/\b(and|or|also|plus)\b/i.test(question) && question.split(/[.?!]/).length > 1) {
    questions.push('Would you like me to focus on a specific part of your question?')
    clarityScore -= 0.15
  }

  // Check for unclear intent
  const ambiguousTerms = /\b(best|good|better|recommend|suggest)\b/i
  if (ambiguousTerms.test(question) && !/\bfor\b/.test(question)) {
    questions.push('What criteria are most important to you?')
    clarityScore -= 0.15
  }

  return {
    needsClarification: clarityScore < 0.7,
    clarityScore: Math.max(0, clarityScore),
    questions,
    reasoning:
      clarityScore >= 0.7
        ? 'Question is clear and specific enough to answer.'
        : 'Question could benefit from clarification to provide a better answer.',
  }
}

/**
 * Check if a question needs clarification
 */
export async function needsClarification(question: string): Promise<boolean> {
  const result = await analyzeClarification(question)
  return result.needsClarification
}
