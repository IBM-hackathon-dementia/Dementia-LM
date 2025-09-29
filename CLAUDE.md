# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"e-umm" (이음이) is a Korean photo-based AI reminiscence therapy platform for dementia care, consisting of:

- **Frontend**: Vite + React with TypeScript, Tailwind CSS, and speech recognition/synthesis
- **Backend**: Cloudflare Worker API with D1 database and KV storage
- **AI Services**: Cloudflare AI Workers for LLM, STT, and image analysis

The application is an ultra-personalized reminiscence-conversation cognitive training app that helps patients and caregivers conduct effective reminiscence therapy at home. It uses LLM to converse with patients based on photos and induces memory-related information through guided questions.

## 🌐 Production URLs (Latest)

- **Frontend**: https://aa24b61b.e-umm-frontend.pages.dev
- **Frontend Alias**: https://test.e-umm-frontend.pages.dev
- **Backend API**: https://eume-api.hwjinfo.workers.dev
- **Database**: Cloudflare D1 (eume-database)

## Development Commands

### Frontend (Main Directory)
- `npm run dev` - Start development server with Vite
- `npm run build` - Build production app (`dist/`)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Backend (eume-api Directory)
- `npm run dev` - Start Cloudflare Worker development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm test` - Run Vitest tests
- `npm run cf-typegen` - Generate Cloudflare Worker types

### Deployment Commands
- `./deploy.bat` - Complete deployment script for Windows
- `./deploy.sh` - Complete deployment script for Unix/Mac
- `wrangler pages deploy dist --project-name=e-umm-frontend` - Frontend deployment only

## Architecture (100% Cloudflare Stack)

### Frontend Structure (Cloudflare Pages)
- **Tech Stack**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v3
- **Voice Interface**: MediaRecorder API (WebM) + SpeechSynthesis API
- **Authentication**: Token-based with localStorage
- **State Management**: Recoil for global state
- **Router**: React Router v6

### Backend Structure (Cloudflare Workers)
- **Main Worker**: `eume-api/src/index.ts`
- **Database**: Cloudflare D1 with full relational schema
- **KV Storage**: Authentication tokens (`CONVERSATION_HISTORY`)
- **AI Models**:
  - `@cf/google/gemma-3-12b-it` (Chat LLM)
  - `@cf/openai/whisper` (Speech-to-Text)
  - `@cf/llava-hf/llava-1.5-7b-hf` (Image Analysis)

### Database Schema (Cloudflare D1)
```sql
-- Complete schema in eume-api/schema.sql
CREATE TABLE users (id, username, name, role, created_at, updated_at);
CREATE TABLE auth_users (id, user_id, password_hash, last_login_at);
CREATE TABLE conversations (id, user_id, session_id, message, response, timestamp);
CREATE TABLE images (id, user_id, image_url, description, status, uploaded_at);
CREATE TABLE reports (id, user_id, image_id, summary, memo, generated_at);
```

### Key Features
- **Personal Memory Map**: Visualizes and databases individual patient memories based on family photos, videos, and keywords uploaded by caregivers
- **Next Best Question (NBQ)**: Analyzes previous conversation reactions and memory map context to recommend questions with high success probability
- **Reaction-based Reporting**: Provides weekly/monthly charts showing positive reaction rates, reminiscence success rates, preferred topics/senses, and response accuracy
- **Personalized Missions**: Offers short, achievable missions like "talking while looking at childhood friend photos" to maintain patient motivation and self-esteem
- Speech-to-text input via browser MediaRecorder API with Cloudflare Whisper
- Text-to-speech output via browser SpeechSynthesis API
- Korean language support with `ko-KR` voice selection
- User session management via localStorage with generated user IDs
- Conversation history stored in Cloudflare KV with 30-minute session timeout
- RAG system for structured dementia care guidelines with contextual guidance retrieval

## Configuration & Environment

### Build Configuration
- **Vite Config**: `vite.config.ts` with environment-specific API URLs
- **TypeScript**: Path mapping `@/*` → `src/*`
- **ESLint**: React + TypeScript rules with Prettier
- **Tailwind**: PostCSS integration with custom design tokens

### Environment Variables
```bash
# .env (Development)
VITE_API_BASE_URL=https://eume-api.hwjinfo.workers.dev
VITE_PRODUCTION=true

# .env.production (Production)
VITE_API_BASE_URL=https://eume-api.hwjinfo.workers.dev
VITE_PRODUCTION=true
```

### Cloudflare Configuration
- **Workers**: Compatibility date 2024-09-01
- **D1 Binding**: `DB` → `eume-database`
- **KV Binding**: `CONVERSATION_HISTORY`
- **AI Binding**: `AI` with multiple models

## API Integration & Data Flow

### Authentication Flow
1. **Login/Signup** → UUID token (not JWT) + user info
2. **Token Storage** → localStorage with AuthTokenManager
3. **API Requests** → Bearer token in Authorization header
4. **Token Refresh** → Automatic refresh when needed

### Conversation Flow
1. **Audio Input** → MediaRecorder API (WebM format)
2. **API Call** → POST with audio + user headers
3. **AI Processing** → Whisper STT → Gemma LLM → Response
4. **Output** → SpeechSynthesis API (ko-KR voice)
5. **Storage** → D1 database + KV for session data

### Error Handling
- **Network Errors**: User-friendly Korean messages with emojis
- **Authentication**: Detailed login/signup error explanations
- **API Failures**: Graceful degradation with retry mechanisms
- **Browser Compatibility**: MediaRecorder + SpeechSynthesis checks

## Development Guidelines

### Code Style
- **Components**: Functional components with TypeScript
- **State**: Recoil atoms for global state management
- **Styling**: Tailwind CSS with utility-first approach
- **API**: Centralized API client with error handling
- **Types**: Strong typing throughout the application

### Korean UX Considerations
- **Language**: All UI text in Korean for elderly users
- **Voice**: Primary interaction method for accessibility
- **Error Messages**: Detailed, empathetic Korean explanations
- **Font**: Korean font optimization for readability
- **Cultural**: Respectful language and age-appropriate design

### Performance Optimizations
- **Vite**: Fast development with HMR
- **Cloudflare Edge**: Global CDN for low latency
- **D1**: Serverless database with automatic scaling
- **Image Optimization**: WebP format with lazy loading
- **Voice Caching**: Browser speech synthesis optimization

## Business Model
The app follows a freemium subscription model with three tiers:
1. **Free Tier**: Limited daily conversations with basic reminiscence prompts
2. **Premium Tier (₩14,900/month)**: Unlimited conversations, advanced content library, personalized features, detailed activity reports
3. **Family Tier (₩24,900/month)**: Premium features + caregiver dashboard, family communication tools, activity monitoring

## Clinical Validation Hypotheses
- H1: NBQ-recommended questions achieve higher reminiscence success rates and positive responses than random questions
- H2: Personalized music and photo sessions improve emotional and behavioral symptoms (depression, agitation)
- H3: Data-driven reports increase caregiver self-efficacy and satisfaction compared to traditional care methods

## 🚀 Migration & Deployment History

### Complete Cloudflare Migration (Sep 2025)
- **✅ Migrated from Supabase to Cloudflare D1**: Full data architecture overhaul
- **✅ Deployed to Cloudflare Pages**: Frontend hosting with edge optimization
- **✅ Cloudflare Workers API**: Serverless backend with global distribution
- **✅ Integrated AI Workers**: LLM, STT, and vision processing
- **✅ D1 Database Setup**: Complete relational schema with auth system

### Key Issues Resolved
1. **Mixed Content Security**: Fixed HTTPS frontend → HTTP backend issue
2. **API URL Configuration**: Resolved hardcoded IP addresses in `vite.config.ts`
3. **Authentication Flow**: Implemented UUID token system with proper user state
4. **Error Handling**: Enhanced user-friendly Korean error messages
5. **Database Migration**: Complete D1 schema setup with user data

### Production Deployment
- **Automated Deployment**: `deploy.bat` and `deploy.sh` scripts
- **CI/CD**: Wrangler-based deployment pipeline
- **Monitoring**: Cloudflare Analytics and error tracking
- **Performance**: Edge-optimized delivery with global CDN

## 🔧 Common Development Issues & Solutions

### Build & Deployment
```bash
# Fix API URL issues
1. Check vite.config.ts hardcoded URLs
2. Verify environment variables in .env
3. Clear build cache: rm -rf dist && npm run build
4. Redeploy: wrangler pages deploy dist --project-name=e-umm-frontend
```

### Authentication Debugging
```bash
# Check token flow
1. Login → Check localStorage tokens
2. API calls → Verify Authorization header
3. Backend → Validate token in D1 database
4. Error → Check specific HTTP status codes
```

### Database Migration
```bash
# D1 setup
1. Deploy schema: wrangler d1 execute eume-database --file=schema.sql --remote
2. Migrate data: Use API endpoints to recreate user accounts
3. Test connectivity: Verify API endpoints work with D1
```

## Test Accounts & Data

### Available Test User
- **Email**: q@q
- **Password**: 11111111
- **Role**: Caregiver
- **Status**: Active in production D1 database

### Testing Endpoints
```bash
# Health check
curl https://eume-api.hwjinfo.workers.dev/health

# Test login
curl -X POST https://eume-api.hwjinfo.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"q@q","password":"11111111"}'

# Test signup
curl -X POST https://eume-api.hwjinfo.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password123","name":"테스트 사용자"}'
```

---

## Development Instructions

### File Creation Policy
- **NEVER** create files unless absolutely necessary for the goal
- **ALWAYS** prefer editing existing files over creating new ones
- **NEVER** proactively create documentation files (*.md) or README files
- Only create documentation files if explicitly requested by the user

### Code Guidelines
- Do what has been asked; nothing more, nothing less
- Follow existing code patterns and conventions
- Maintain Korean language support throughout
- Ensure proper error handling and user feedback
- Test all changes in development before deploying

### Deployment Process
1. Test locally with `npm run dev`
2. Build production with `npm run build`
3. Deploy with `./deploy.bat` or individual commands
4. Verify deployment at production URLs
5. Test key functionality (login, conversation, etc.)

---

**Last Updated**: September 2025 - Complete Cloudflare migration and optimization
