#!/bin/bash

# Get All Files Script
# This script creates a ZIP file with all project files for easy transfer

echo "📦 Creating ZIP package with all AI Coder files..."

# Create a temporary directory for packaging
TEMP_DIR="/tmp/ai-coder-$(date +%s)"
mkdir -p "$TEMP_DIR"

# Copy all project files (excluding git, node_modules, etc.)
cp -r /workspace/* "$TEMP_DIR/" 2>/dev/null || true

# Remove unnecessary files
cd "$TEMP_DIR"
rm -rf .git node_modules tmp extract browser .gitignore .gitattributes 2>/dev/null || true

# Create the ZIP file
cd /tmp
zip -r "ai-coder-complete-$(date +%Y%m%d-%H%M%S).zip" "ai-coder-$(date +%s)" > /dev/null

# Show the ZIP file location
ZIP_FILE=$(ls -t ai-coder-complete-*.zip | head -1)
echo "✅ ZIP file created: /tmp/$ZIP_FILE"
echo ""
echo "📁 To get your files:"
echo "1. Download the ZIP file: /tmp/$ZIP_FILE"
echo "2. Extract it in your desired location"
echo "3. Run: cd ai-coder-* && ./setup.sh"
echo ""
echo "🔐 For GitHub push:"
echo "1. cd ai-coder-*"
echo "2. git remote set-url origin https://YOUR_TOKEN@github.com/rosesareblack/coder-1.git"
echo "3. git add ."
echo "4. git commit -m 'init: Complete Open Source AI Coder with esbuild'"
echo "5. git push -u origin master"
echo ""
echo "💡 Or use Personal Access Token when prompted for password"