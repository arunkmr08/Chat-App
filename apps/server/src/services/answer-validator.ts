import type { RAGContext } from './rag.js'

/**
 * Answer Validation Service
 * Ensures AI responses are grounded in the provided context
 */

export interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  suggestions: string[]
}

/**
 * Validate that an answer is grounded in the provided context
 */
export function validateAnswer(answer: string, context: RAGContext): ValidationResult {
  const issues: string[] = []
  const suggestions: string[] = []
  let confidence = 1.0

  // Check if answer is empty
  if (!answer || answer.trim().length === 0) {
    return {
      isValid: false,
      confidence: 0,
      issues: ['Answer is empty'],
      suggestions: ['Generate a proper response'],
    }
  }

  // Check for hallucination indicators
  const hallucination Indicators = [
    /I don't have|cannot find|no information/i,
    /according to (the|my) (knowledge|training|database)/i,
    /as an AI/i,
    /I (apologize|sorry)/i,
  ]

  for (const pattern of hallucinationIndicators) {
    if (pattern.test(answer)) {
      issues.push(`Detected potential refusal pattern: ${pattern}`)
      confidence *= 0.9
    }
  }

  // Check citation usage
  const citationPattern = /\[(?:Document|Source)\s+\d+\]/g
  const citations = answer.match(citationPattern) || []

  if (context.chunks.length > 0 && citations.length === 0) {
    issues.push('Answer does not include citations despite having context')
    suggestions.push('Add citations to support claims')
    confidence *= 0.8
  }

  // Verify cited documents exist
  const citedNumbers = new Set(
    citations.map((c) => parseInt(c.match(/\d+/)?.[0] || '0', 10))
  )

  const validDocNumbers = new Set(
    context.citations.map((c, i) => i + 1)
  )

  for (const num of citedNumbers) {
    if (!validDocNumbers.has(num)) {
      issues.push(`Citation [Document ${num}] does not exist in context`)
      confidence *= 0.7
    }
  }

  // Check answer length relative to context
  if (answer.length > context.chunks.join(' ').length * 2) {
    issues.push('Answer is significantly longer than available context')
    suggestions.push('Answer may contain information not in context')
    confidence *= 0.8
  }

  // Determine validity
  const isValid = confidence >= 0.7 && issues.length < 3

  return {
    isValid,
    confidence,
    issues,
    suggestions,
  }
}

/**
 * Detect potential hallucinations in AI responses
 */
export function detectHallucination(answer: string, context: RAGContext): boolean {
  const validation = validateAnswer(answer, context)
  return validation.confidence < 0.7
}

/**
 * Calculate confidence score for an answer
 */
export function calculateConfidence(answer: string, context: RAGContext): number {
  const validation = validateAnswer(answer, context)
  return validation.confidence
}
