import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { codeExecutionRoutes } from './routes/execution.js'
import { aiRoutes } from './routes/ai.js'
import { config } from './config/index.js'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}))
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10,
  duration: 60,
})

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip)
    next()
  } catch {
    res.status(429).json({ error: 'Too many requests' })
  }
})

// API Routes
app.use('/api/execute', codeExecutionRoutes)
app.use('/api/ai', aiRoutes)

// Serve static files in production
if (config.nodeEnv === 'production') {
  app.use(express.static('dist'))
  app.get('*', (req, res) => {
    res.sendFile('dist/index.html', { root: '.' })
  })
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('execute-code', async (data) => {
    // Emit execution started
    socket.emit('execution-started')
    
    try {
      // Here you would implement actual code execution
      socket.emit('execution-progress', 'Setting up execution environment...')
      
      // Simulate execution
      setTimeout(() => {
        socket.emit('execution-progress', 'Running code...')
      }, 1000)
      
      setTimeout(() => {
        socket.emit('execution-complete', {
          success: true,
          output: 'Code executed successfully!'
        })
      }, 3000)
      
    } catch (error) {
      socket.emit('execution-error', {
        error: error instanceof Error ? error.message : 'Execution failed'
      })
    }
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

const PORT = config.port

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🔧 Environment: ${config.nodeEnv}`)
})

export { app, io }