# Open Source AI Coder

A full-featured, open source AI-powered code editor with execution capabilities. Built with React, Express, Docker, and Gemini AI.

## 🚀 Features

- **AI-Powered Coding Assistant**: Real-time code suggestions using Gemini AI
- **Multi-Language Support**: JavaScript, TypeScript, Python with Docker execution
- **Monaco Editor**: VS Code-style editing experience
- **Real-time Terminal**: Live code execution with output display
- **Secure Execution**: Docker-based sandboxed code execution
- **Full Control**: Open source, self-hosted solution
- **Modern Stack**: React 18, Express, TypeScript, Tailwind CSS

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ 
- Docker (for code execution)
- Gemini API Key ([Get one here](https://ai.google.dev/))

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-coder
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   NODE_ENV=development
   DOCKER_ENABLED=true
   MAX_EXECUTION_TIME=30000
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```
   
   This starts:
   - Frontend: http://localhost:3000 (esbuild dev server - lightning fast! ⚡)
   - Backend: http://localhost:3001 (Express API)

### Production Deployment

#### Docker (Recommended)

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access Application**
   - Frontend: http://localhost:3001
   - API: http://localhost:3001/api

#### Manual Build

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## 🏗️ Architecture

```
├── src/
│   ├── main.tsx          # Frontend entry point
│   ├── App.tsx           # Main React application
│   ├── components/       # React components
│   │   ├── AIAssistant.tsx
│   │   └── TerminalPanel.tsx
│   └── server/          # Backend API
│       ├── index.ts     # Express server
│       ├── config/      # Configuration
│       └── routes/      # API endpoints
│           ├── execution.ts  # Code execution
│           └── ai.ts         # AI integration
├── scripts/             # esbuild build scripts
│   ├── dev-server.js   # Lightning-fast dev server
│   └── build.js        # Production build script
├── public/              # Static assets for dev
├── dist/                # Built frontend
├── package.json         # Dependencies
├── .env.local          # Environment variables
├── Dockerfile          # Docker configuration
└── docker-compose.yml  # Container orchestration
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini AI API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment mode | development |
| `DOCKER_ENABLED` | Enable Docker execution | true |
| `MAX_EXECUTION_TIME` | Code execution timeout (ms) | 30000 |
| `MAX_MEMORY_USAGE` | Docker memory limit | 256m |
| `CORS_ORIGIN` | Frontend URL | http://localhost:3000 |

### AI Configuration

The AI assistant uses Google Gemini Pro model. Configure in `src/server/routes/ai.ts`:

```typescript
const model = google('gemini-pro')
```

### Supported Languages

- **JavaScript/TypeScript**: Native Node.js execution
- **Python**: Docker container with Python 3
- **More coming soon**: Go, Rust, Java

## 🎯 Usage

### Code Editor

1. **Write Code**: Use Monaco editor with syntax highlighting
2. **AI Assistant**: Click "AI Assistant" panel for help
3. **Quick Actions**: Use predefined prompts or custom questions
4. **Run Code**: Click "Run Code" to execute in Docker container

### AI Features

- **Code Explanation**: Understand complex code snippets
- **Optimization**: Get performance improvement suggestions
- **Bug Detection**: Find potential issues in your code
- **Refactoring**: Improve code readability and structure
- **Auto-Fix**: Apply AI-generated code improvements

### Terminal

- Real-time execution output
- Command history tracking
- Error display and debugging info

## 🐳 Docker Configuration

### Code Execution Security

- **Isolated Containers**: Each execution runs in separate Docker container
- **Resource Limits**: Memory and CPU constraints enforced
- **Timeout Protection**: Prevents infinite loops and long-running code
- **Network Isolation**: No external network access during execution

### Custom Execution Images

Add language support by modifying `src/server/routes/execution.ts`:

```typescript
case 'rust':
  imageName = 'rust:1.70-slim'
  command = 'rustc main.rs && ./main'
  break
```

## 🚀 Deployment Options

### 1. Local Docker
```bash
docker-compose up
```

### 2. Cloud Deployment

**AWS ECS**: Use the Dockerfile with ECS task definition
**Google Cloud Run**: Deploy with Cloud Build
**DigitalOcean App Platform**: Connect GitHub repo
**Railway/Heroku**: One-click deploy

### 3. VPS Deployment

```bash
# Clone repo
git clone <repo-url>
cd ai-coder

# Setup environment
cp .env.example .env
vim .env

# Deploy with Docker
docker-compose up -d
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Code linting
npm run lint

# Type checking
npm run type-check
```

## 🛡️ Security Considerations

- **API Rate Limiting**: 10 requests per minute per IP
- **CORS Protection**: Configured for specific origins
- **Helmet Security**: Security headers enabled
- **Docker Isolation**: Code execution in sandboxed containers
- **Input Validation**: Zod schema validation for all inputs

## 📈 Performance

- **Frontend**: esbuild bundler (the speed king! ⚡) for lightning-fast builds and HMR
- **Backend**: Express.js with connection pooling
- **Database**: Optional SQLite for session management
- **Caching**: Response caching for AI requests
- **Compression**: Gzip compression for static assets

## 🔮 Roadmap

- [ ] **Multi-file Projects**: Support for entire project structures
- [ ] **Git Integration**: Clone and manage repositories
- [ ] **Collaboration**: Real-time collaborative editing
- [ ] **Plugins**: Extension system for custom functionality
- [ ] **Mobile**: Responsive design for tablets/phones
- [ ] **VS Code Extension**: Extension for VS Code users
- [ ] **Cloud Storage**: Save/load projects to cloud storage
- [ ] **More Languages**: Go, Rust, Java, C++ execution
- [ ] **AI Training**: Custom model fine-tuning options

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [AI SDK](https://sdk.vercel.ai/) - Vercel AI integration
- [Docker](https://www.docker.com/) - Container platform
- [Gemini API](https://ai.google.dev/) - Google's AI model

## 📞 Support

- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: [your-email@domain.com] for direct contact

---

**Built with ❤️ for the open source community**