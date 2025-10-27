export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  executionTime?: number
  language?: string
}

export interface AIRequest {
  code: string
  prompt: string
  context?: string
}

export interface AIResponse {
  suggestion: string
  explanation?: string
  alternative?: string
}

export interface ProjectFile {
  name: string
  content: string
  language: string
}