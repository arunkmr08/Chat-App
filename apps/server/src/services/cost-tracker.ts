/**
 * Cost Tracking Service
 * Tracks AI API costs across all models
 */

// Pricing per 1K tokens (as of January 2025)
const MODEL_PRICING = {
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },

  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },

  // Google
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
} as const

export interface CostCalculation {
  inputCost: number
  outputCost: number
  totalCost: number
  model: string
  inputTokens: number
  outputTokens: number
}

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): CostCalculation {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]

  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`)
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      model,
      inputTokens,
      outputTokens,
    }
  }

  // Calculate cost (pricing is per 1K tokens)
  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  const totalCost = inputCost + outputCost

  return {
    inputCost,
    outputCost,
    totalCost,
    model,
    inputTokens,
    outputTokens,
  }
}

/**
 * Format cost as USD
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`
}

/**
 * Get total cost from multiple calculations
 */
export function aggregateCosts(calculations: CostCalculation[]): number {
  return calculations.reduce((sum, calc) => sum + calc.totalCost, 0)
}

/**
 * Log cost information
 */
export function logCost(calculation: CostCalculation): void {
  console.log(
    `[Cost] ${calculation.model}: ${formatCost(calculation.totalCost)} ` +
      `(${calculation.inputTokens} in + ${calculation.outputTokens} out)`
  )
}
