import { Router } from 'express'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

const router = Router()

// AI Chat endpoint
router.post('/chat', async (req, res) => {
  const { code, prompt, context } = req.body
  
  if (!code || !prompt) {
    return res.status(400).json({
      error: 'Code and prompt are required'
    })
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.'
      })
    }

    const model = google('gemini-pro')

    const systemPrompt = `You are an AI coding assistant. You help developers write, debug, optimize, and understand code.

Current code context:
\`\`\`
${code}
\`\`\`

Previous conversation:
${context || 'No previous context'}

Guidelines:
1. Provide clear, actionable suggestions
2. Include code examples when helpful
3. Explain technical concepts simply
4. Focus on best practices and modern solutions
5. If asked to improve code, provide the improved version as "alternative" in your response`

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt,
    })

    res.json({
      suggestion: result.text,
      explanation: `Generated with ${result.usage.tokensIn / 1000}k tokens`,
      alternative: extractAlternativeCode(result.text)
    })

  } catch (error) {
    console.error('AI chat error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'AI service error'
    })
  }
})

// AI Code Review endpoint
router.post('/review', async (req, res) => {
  const { code } = req.body
  
  if (!code) {
    return res.status(400).json({
      error: 'Code is required'
    })
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.'
      })
    }

    const model = google('gemini-pro')

    const result = await generateText({
      model,
      system: `You are an expert code reviewer. Analyze the provided code and give constructive feedback covering:

1. Code quality and best practices
2. Potential bugs or security issues
3. Performance improvements
4. Code style and readability
5. Modern language features usage

Provide actionable suggestions for improvement.`,
      prompt: `Please review this code:

\`\`\`
${code}
\`\`\`

Provide specific suggestions for improvement with examples where helpful.`,
    })

    res.json({
      review: result.text,
      score: calculateCodeScore(result.text),
      suggestions: extractSuggestions(result.text)
    })

  } catch (error) {
    console.error('AI review error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'AI service error'
    })
  }
})

// Helper function to extract alternative code suggestions
function extractAlternativeCode(text: string): string | undefined {
  const codeBlockMatch = text.match(/```(?:javascript|typescript|js|ts)?\n([\s\S]*?)```/i)
  return codeBlockMatch?.[1]?.trim()
}

// Helper function to calculate a code quality score
function calculateCodeScore(reviewText: string): number {
  let score = 80 // Base score
  
  // Adjust score based on review content
  if (reviewText.toLowerCase().includes('excellent') || reviewText.toLowerCase().includes('great')) {
    score += 10
  }
  if (reviewText.toLowerCase().includes('bug') || reviewText.toLowerCase().includes('issue')) {
    score -= 15
  }
  if (reviewText.toLowerCase().includes('performance')) {
    score -= 10
  }
  if (reviewText.toLowerCase().includes('security')) {
    score -= 20
  }
  if (reviewText.toLowerCase().includes('refactor')) {
    score -= 5
  }
  
  return Math.max(0, Math.min(100, score))
}

// Helper function to extract specific suggestions
function extractSuggestions(reviewText: string): string[] {
  const suggestions: string[] = []
  
  // Look for numbered lists or bullet points
  const lines = reviewText.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\d+\./.test(trimmed) || /^[-*•]/.test(trimmed)) {
      suggestions.push(trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, ''))
    }
  }
  
  // Fallback: split by "Consider" or "Try"
  if (suggestions.length === 0) {
    const considerMatches = reviewText.match(/Consider[^.]*\./g) || []
    const tryMatches = reviewText.match(/Try[^.]*\./g) || []
    suggestions.push(...considerMatches, ...tryMatches)
  }
  
  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

export { router as aiRoutes }