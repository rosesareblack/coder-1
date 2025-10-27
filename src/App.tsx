import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Code, Play, Settings, Bot, Terminal } from 'lucide-react'
import { AIAssistant } from './components/AIAssistant'
import { TerminalPanel } from './components/TerminalPanel'
import { ExecutionResult } from './types'

function App() {
  const [code, setCode] = useState(`// Welcome to Open Source AI Coder!
// Write your code below and let AI help you

function helloWorld() {
  console.log("Hello from AI-powered coding!");
  return "Success!";
}

helloWorld();`)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor')

  const handleRunCode = async () => {
    setIsRunning(true)
    setOutput('Running code...')
    
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      
      const result: ExecutionResult = await response.json()
      setOutput(result.output || result.error || 'No output')
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">Open Source AI Coder</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                isAIPanelOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
            
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-md transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? 'Running...' : 'Run Code'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className={`${isAIPanelOpen ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-700`}>
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="flex space-x-1 p-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'editor' 
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                Editor
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'terminal' 
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Terminal className="w-4 h-4 inline mr-2" />
                Terminal
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'editor' ? (
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="h-full bg-gray-900 p-4 font-mono text-sm">
                <div className="mb-2 text-green-400">$ npm start</div>
                <div className="text-gray-300 whitespace-pre-wrap">{output}</div>
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Panel */}
        {isAIPanelOpen && (
          <div className="w-1/2 flex flex-col">
            <AIAssistant code={code} onCodeChange={setCode} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App