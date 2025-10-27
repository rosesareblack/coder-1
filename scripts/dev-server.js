#!/usr/bin/env node

import { build, serve } from 'esbuild'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let server = null

async function startDevServer() {
  console.log('🚀 Starting esbuild development server...')
  
  // Start esbuild with serve
  server = await serve({
    port: 3000,
    servedir: 'public',
  }, {
    entryPoints: ['src/main.tsx'],
    outfile: 'public/bundle.js',
    bundle: true,
    format: 'esm',
    sourcemap: true,
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.css': 'css',
      '.png': 'file',
      '.jpg': 'file',
      '.gif': 'file',
      '.svg': 'file',
      '.ico': 'file',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
    watch: {
      onRebuild(error, result) {
        if (error) {
          console.error('❌ Build failed:', error)
        } else {
          console.log('✅ Build succeeded - refreshing browser...')
          // Trigger browser refresh
          broadcastUpdate()
        }
      },
    },
    plugins: [
      // PostCSS plugin for Tailwind
      {
        name: 'postcss',
        setup(build) {
          build.onLoad({ filter: /\.css$/ }, async (args) => {
            const fs = await import('fs/promises')
            const css = await fs.readFile(args.path, 'utf8')
            
            const postcss = (await import('postcss')).default
            const tailwindcss = (await import('tailwindcss')).default
            const autoprefixer = (await import('autoprefixer')).default
            
            const result = await postcss([tailwindcss, autoprefixer]).process(css, {
              from: args.path,
            })
            
            return {
              contents: result.css,
              loader: 'css',
              watchFiles: [args.path],
            }
          })
        },
      },
    ],
  })

  console.log(`📡 Dev server running at http://localhost:${server.port}`)
  console.log('🔄 Watching for changes...')
  
  return server
}

// Simple browser refresh mechanism
function broadcastUpdate() {
  // This is a simple approach - in a real app you might want
  // to use a more sophisticated hot reload system like Vite
  console.log('🔄 Browser will refresh on next build')
}

startDevServer().catch(error => {
  console.error('❌ Failed to start dev server:', error)
  process.exit(1)
})

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dev server...')
  if (server) {
    server.stop()
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (server) {
    server.stop()
  }
  process.exit(0)
})