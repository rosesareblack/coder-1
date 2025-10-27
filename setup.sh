#!/bin/bash

# Open Source AI Coder - Quick Setup Script
# This script will set up the development environment

set -e

echo "🚀 Setting up Open Source AI Coder with esbuild (Speed King!)..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need it for code execution."
    echo "   Install Docker from: https://docs.docker.com/get-docker/"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment file
echo ""
echo "🔧 Setting up environment..."
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from template"
    echo "⚠️  Please edit .env.local and add your Gemini API key"
else
    echo "✅ .env.local already exists"
fi

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p data
mkdir -p logs
mkdir -p temp

echo ""
echo "🎉 Setup complete! (Powered by esbuild - the Speed King! ⚡)"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your Gemini API key:"
echo "   GEMINI_API_KEY=your_key_here"
echo ""
echo "2. Start development server:"
echo "   npm run dev  (Lightning-fast builds with esbuild!)"
echo ""
echo "3. Open your browser to:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "For Docker deployment:"
echo "   docker-compose up --build"
echo ""
echo "Happy coding! 🐱‍💻"