import { z } from 'zod'

const configSchema = z.object({
  port: z.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  geminiApiKey: z.string().optional(),
  dockerEnabled: z.boolean().default(true),
  maxExecutionTime: z.number().default(30000),
  maxMemoryUsage: z.string().default('256m'),
  corsOrigin: z.string().default('http://localhost:3000')
})

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: (process.env.NODE_ENV as any) || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  dockerEnabled: process.env.DOCKER_ENABLED !== 'false',
  maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME || '30000'),
  maxMemoryUsage: process.env.MAX_MEMORY_USAGE || '256m',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}

export type Config = typeof config