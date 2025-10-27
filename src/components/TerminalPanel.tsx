import { useState, useEffect } from 'react'
import { Terminal } from 'lucide-react'

interface TerminalPanelProps {
  output: string
  isRunning: boolean
}

export function TerminalPanel({ output, isRunning }: TerminalPanelProps) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<Array<{ command: string; output: string }>>([])

  useEffect(() => {
    if (output) {
      setHistory(prev => [...prev.slice(-9), { command: 'npm start', output }])
    }
  }, [output])

  return (
    <div className="h-full bg-gray-900 text-white font-mono text-sm">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center space-x-2">
        <Terminal className="w-4 h-4" />
        <span className="text-sm font-medium">Terminal</span>
      </div>
      
      <div className="p-4 h-full overflow-y-auto">
        {history.length === 0 && !isRunning ? (
          <div className="text-gray-500">Terminal ready. Click "Run Code" to execute.</div>
        ) : (
          <div className="space-y-2">
            {history.map((entry, index) => (
              <div key={index} className="space-y-1">
                <div className="text-green-400">$ {entry.command}</div>
                <div className="text-gray-300 whitespace-pre-wrap">{entry.output}</div>
              </div>
            ))}
            
            {isRunning && (
              <div className="text-green-400">
                $ npm start
                <div className="text-blue-400 animate-pulse">Running code...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}