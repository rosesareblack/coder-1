#!/bin/bash

# Git Push Script for Open Source AI Coder
# This script will add, commit, and push all files to your GitHub repository

echo "🚀 Pushing Open Source AI Coder to GitHub..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    # Commit with descriptive message
    echo "💾 Committing changes..."
    git commit -m "feat: Complete Open Source AI Coder with esbuild

✨ Features:
- AI-powered coding assistant with Gemini integration
- Monaco Editor with syntax highlighting
- Multi-language code execution (JavaScript, Python, TypeScript)
- Docker-based secure sandboxed execution
- Real-time terminal with WebSocket updates
- Modern React 18 frontend with TailwindCSS
- Express.js backend with rate limiting and security
- Ultra-fast esbuild development server
- Production-ready Docker deployment
- Complete TypeScript type safety

🛠️ Tech Stack:
- Frontend: React 18, Monaco Editor, TailwindCSS, Radix UI
- Backend: Express.js, Socket.IO, Dockerode
- AI: Google Gemini API
- Build: esbuild (Lightning fast!)
- Security: Helmet, CORS, Rate limiting
- Deployment: Docker, docker-compose"

    echo "✅ Changes committed successfully"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Adding remote origin..."
    git remote add origin https://github.com/rosesareblack/coder-1.git
fi

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
echo "Repository: https://github.com/rosesareblack/coder-1.git"
echo ""

# Try to push (will prompt for credentials if needed)
git push -u origin main 2>/dev/null || {
    echo "❌ Push failed. Possible issues:"
    echo "   1. Repository doesn't exist on GitHub"
    echo "   2. Authentication required"
    echo "   3. Permission denied"
    echo ""
    echo "💡 Solutions:"
    echo "   1. Create repository on GitHub: https://github.com/new"
    echo "   2. Use GitHub CLI: gh auth login"
    echo "   3. Use personal access token instead of password"
    echo ""
    echo "Manual commands:"
    echo "   git push -u origin main"
}

echo ""
echo "🎉 Git operations completed!"
echo ""
echo "Next steps:"
echo "1. Verify push on GitHub: https://github.com/rosesareblack/coder-1"
echo "2. Install dependencies: npm install"
echo "3. Set up environment: cp .env.example .env.local"
echo "4. Add your Gemini API key to .env.local"
echo "5. Start development: npm run dev"