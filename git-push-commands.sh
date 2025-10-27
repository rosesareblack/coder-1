#!/bin/bash

# Git Push Commands for Open Source AI Coder
# Run this script in your local repository directory

echo "🚀 Pushing Open Source AI Coder to GitHub..."

# Add all files
git add .

# Commit with init message
git commit -m "init: Complete Open Source AI Coder with esbuild

✨ Features:
- AI-powered coding assistant with Gemini integration
- Monaco Editor with syntax highlighting
- Multi-language code execution (JS, Python, TS)
- Docker-based secure sandboxed execution
- Real-time terminal with WebSocket updates
- Ultra-fast esbuild development server

🛠️ Tech Stack:
- Frontend: React 18, Monaco Editor, TailwindCSS
- Backend: Express.js, Socket.IO, Dockerode
- AI: Google Gemini API
- Build: esbuild (Lightning fast!)
- Security: Helmet, CORS, Rate limiting"

# Add remote (if not already exists)
if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin https://github.com/rosesareblack/coder-1.git
    echo "✅ Added remote origin"
else
    echo "✅ Remote origin already exists"
fi

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push -u origin master

echo ""
echo "🎉 Pushed successfully!"
echo "Repository: https://github.com/rosesareblack/coder-1"