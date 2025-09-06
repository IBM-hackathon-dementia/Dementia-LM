# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"e-umm" (이음이) is a Korean photo-based AI reminiscence therapy platform for dementia care, consisting of:

- **Frontend**: Next.js 15 app with TypeScript, Tailwind CSS 4, and speech recognition/synthesis
- **Backend**: Cloudflare Worker API with KV storage for conversation history and RAG system

The application is an ultra-personalized reminiscence-conversation cognitive training app that helps patients and caregivers conduct effective reminiscence therapy at home. It uses LLM to converse with patients based on photos and induces memory-related information through guided questions.


## Development Commands

### Frontend (Main Directory)
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production app with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Backend (eume-api Directory)
- `npm run dev` - Start Cloudflare Worker development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm test` - Run Vitest tests
- `npm run cf-typegen` - Generate Cloudflare Worker types

## Architecture

### Frontend Structure
- **src/app/**: Next.js App Router pages and layout
  - `page.tsx`: Main voice interaction interface with MediaRecorder API
  - `layout.tsx`: Root layout with Geist fonts
- **src/types/**: TypeScript type definitions for dementia care guide
- **src/utils/**: Utility functions for dementia care guide data access
- **src/data/**: JSON data for dementia care guidelines

### Backend Structure (eume-api/)
- **src/index.ts**: Main Cloudflare Worker handler
- **KV Storage**: Conversation history persistence with binding `CONVERSATION_HISTORY`
- **API Endpoint**: `https://eume-api.hwjinfo.workers.dev`

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

## Configuration
- **TypeScript**: Configured with `@/*` path mapping to `src/*`
- **Tailwind**: Version 4 with PostCSS
- **ESLint**: Next.js config with Prettier integration
- **Cloudflare Worker**: Compatibility date 2023-01-01

## API Integration
The frontend communicates with the Cloudflare Worker API by:
1. Recording audio as WebM format
2. Sending to API with user ID header
3. Receiving JSON response with `responseText` field
4. Converting response to speech via browser TTS

## Development Notes
- The app targets Korean elderly users, so UI text is in Korean
- Voice interface is the primary interaction method for accessibility
- Error handling includes microphone permission checks
- Speech synthesis can be cancelled when new recording starts
- Conversation stage detection uses simple heuristics (initial/conversation/reminiscence/closure)
- RAG system maps user input keywords to relevant dementia care guidance
- AI model responses are limited to 2-3 sentences for clarity and comprehension
- System prioritizes patient emotional support over factual correction

## Business Model
The app follows a freemium subscription model with three tiers:
1. **Free Tier**: Limited daily conversations with basic reminiscence prompts
2. **Premium Tier (₩14,900/month)**: Unlimited conversations, advanced content library, personalized features, detailed activity reports
3. **Family Tier (₩24,900/month)**: Premium features + caregiver dashboard, family communication tools, activity monitoring

## Clinical Validation Hypotheses
- H1: NBQ-recommended questions achieve higher reminiscence success rates and positive responses than random questions
- H2: Personalized music and photo sessions improve emotional and behavioral symptoms (depression, agitation)
- H3: Data-driven reports increase caregiver self-efficacy and satisfaction compared to traditional care methods
