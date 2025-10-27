import { useState } from 'react'
import { Bot, Send, Lightbulb, Code2, Bug } from 'lucide-react'
import { AIRequest, AIResponse } from '../types'

interface AIAssistantProps {
  code: string
  onCodeChange: (code: string) => void
}

const PROMPTS = [
  { icon: Lightbulb, label: 'Explain Code', prompt: 'Explain what this code does' },
  { icon: Code2, label: 'Optimize', prompt: 'Optimize this code for better performance' },
  { icon: Bug, label: 'Find Issues', prompt: 'Find potential bugs and issues in this code' },
  { icon: Code2, label: 'Refactor', prompt: 'Refactor this code to be more readable' }
]

export function AIAssistant({ code, onCodeChange }: AIAssistantProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hi! I\'m your AI coding assistant. I can help you write, debug, and optimize your code. How can I help you today?' }
  ])

  const handleSend = async (prompt?: string) => {
    const userMessage = prompt || input
    if (!userMessage.trim()) return

    const newUserMessage = { role: 'user' as const, content: userMessage }
    setConversation(prev => [...prev, newUserMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          prompt: userMessage,
          context: conversation.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
        } as AIRequest),
      })

      const result: AIResponse = await response.json()
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: result.suggestion + (result.explanation ? `\n\nExplanation:\n${result.explanation}` : '')
      }])

      if (result.alternative) {
        onCodeChange(result.alternative)
      }
    } catch (error) {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get AI response'}`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center space-x-3">
          <Bot className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          {PROMPTS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => handleSend(item.prompt)}
                className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
                disabled={isLoading}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your code..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 p-2 rounded-md transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}