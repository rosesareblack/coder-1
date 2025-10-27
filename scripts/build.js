#!/usr/bin/env node

import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function buildFrontend() {
  console.log('🔨 Building frontend with esbuild...')
  
  try {
    // Ensure dist directory exists
    await fs.mkdir('dist', { recursive: true })
    
    // Build the application
    const result = await build({
      entryPoints: ['src/main.tsx'],
      outdir: 'dist',
      bundle: true,
      format: 'esm',
      sourcemap: true,
      minify: true,
      target: ['es2020'],
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
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      plugins: [
        // PostCSS plugin for Tailwind
        {
          name: 'postcss',
          setup(build) {
            build.onLoad({ filter: /\.css$/ }, async (args) => {
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
              }
            })
          },
        },
      ],
    })
    
    // Copy index.html to dist
    await fs.copyFile('index.html', 'dist/index.html')
    
    console.log('✅ Frontend build completed!')
    console.log('📦 Output:', path.resolve(__dirname, '..', 'dist'))
    
    // Display build stats
    if (result && result.errors.length === 0) {
      console.log('📊 Build Statistics:')
      console.log(`   • Entry point: src/main.tsx`)
      console.log(`   • Output directory: dist`)
      console.log(`   • Bundle format: ESM`)
      console.log(`   • Minified: ✅`)
      console.log(`   • Source maps: ✅`)
      console.log(`   • Watch mode: ❌`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Build failed:', error)
    throw error
  }
}

// Run the build
buildFrontend()
  .then(() => {
    console.log('🎉 Build completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Review the build in ./dist/')
    console.log('2. Test the production build: npm start')
    console.log('3. Deploy to your hosting platform')
  })
  .catch(error => {
    console.error('💥 Build failed:', error)
    process.exit(1)
  })