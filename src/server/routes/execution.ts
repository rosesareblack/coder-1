import { Router } from 'express'
import Docker from 'dockerode'
import fs from 'fs/promises'
import path from 'path'
import { nanoid } from 'nanoid'
import { config } from '../config/index.js'

const router = Router()
const docker = new Docker()

// Code execution endpoint
router.post('/', async (req, res) => {
  const { code, language = 'javascript' } = req.body
  
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Code is required and must be a string' 
    })
  }

  const executionId = nanoid()
  const workspacePath = `/tmp/ai-coder-${executionId}`
  const outputFile = path.join(workspacePath, 'output.txt')
  
  try {
    // Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true })
    
    // Write code to file based on language
    let codeFile = ''
    let command = ''
    
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        codeFile = path.join(workspacePath, 'main.js')
        await fs.writeFile(codeFile, code)
        command = 'node main.js'
        break
        
      case 'python':
      case 'py':
        codeFile = path.join(workspacePath, 'main.py')
        await fs.writeFile(codeFile, code)
        command = 'python3 main.py'
        break
        
      case 'typescript':
      case 'ts':
        codeFile = path.join(workspacePath, 'main.ts')
        await fs.writeFile(codeFile, code)
        command = 'npx tsx main.ts'
        break
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported language: ${language}`
        })
    }

    if (!config.dockerEnabled) {
      // Fallback execution without Docker (development only)
      return await executeWithoutDocker(code, language, res)
    }

    // Execute with Docker
    const result = await executeWithDocker(codeFile, command, workspacePath)
    
    res.json(result)
    
  } catch (error) {
    console.error('Execution error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed'
    })
  } finally {
    // Cleanup
    try {
      await fs.rm(workspacePath, { recursive: true, force: true })
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
  }
})

// Execute code without Docker (development fallback)
async function executeWithoutDocker(code: string, language: string, res: any) {
  try {
    if (language.toLowerCase() === 'javascript') {
      // Simple eval for JS (very basic, not secure - only for dev)
      const consoleOutput: string[] = []
      const mockConsole = {
        log: (...args: any[]) => consoleOutput.push(args.join(' ')),
        error: (...args: any[]) => consoleOutput.push('ERROR: ' + args.join(' ')),
        warn: (...args: any[]) => consoleOutput.push('WARNING: ' + args.join(' '))
      }
      
      const func = new Function('console', code)
      func(mockConsole)
      
      res.json({
        success: true,
        output: consoleOutput.join('\n') || 'Code executed successfully',
        language
      })
    } else {
      res.status(400).json({
        success: false,
        error: `Language ${language} requires Docker execution`
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed'
    })
  }
}

// Execute code with Docker
async function executeWithDocker(codeFile: string, command: string, workspacePath: string) {
  const startTime = Date.now()
  
  try {
    // Pull image if needed (for this example, we'll use busybox as it's always available)
    // In production, you'd use specific language images
    const containers = await docker.listContainers()
    console.log('Available containers:', containers.length)
    
    // Create and run container
    const container = await docker.createContainer({
      Image: 'node:18-alpine',
      Cmd: ['/bin/sh', '-c', 'apk add --no-cache python3 && ' + command],
      WorkingDir: '/workspace',
      Tty: false,
      HostConfig: {
        Binds: [`${workspacePath}:/workspace:rw`],
        Memory: parseInt(config.maxMemoryUsage) * 1024 * 1024, // Convert MB to bytes
        CpuShares: 512
      },
      Env: [
        'NODE_ENV=production',
        'PYTHONPATH=/usr/lib/python3'
      ]
    })

    await container.start()
    
    // Wait for execution with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Execution timeout')), config.maxExecutionTime)
    )
    
    const executionPromise = container.wait()
    
    await Promise.race([executionPromise, timeoutPromise])
    
    // Get output
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false
    })
    
    const output = logs.toString('utf8')
    
    // Cleanup
    await container.remove()
    
    return {
      success: true,
      output: output || 'Code executed successfully',
      executionTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('Docker execution error:', error)
    throw error
  }
}

export { router as codeExecutionRoutes }