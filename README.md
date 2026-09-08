# ORCA â€” RAG & Real-Time Voice AI Integration Stack

Extracted from the Kaligan repository, this codebase provides a complete, production-ready implementation of **Retrieval-Augmented Generation (RAG)** and **Real-Time Voice AI** powered by Google Gemini Multimodal Live, designed for integration into any website or application.

---

## ðŸ—ï¸ Architecture & Component Overview

```
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚                 Client Tier                  â”‚
                      â”‚  â€¢ Embeddable JS Widget (widget/)            â”‚
                      â”‚  â€¢ React Hooks & Orb Visualizer (useLiveSession)
                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                             â”‚ Web Audio API (PCM 16kHz)
                                             â”‚ & REST Session Token
                                             â–¼
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚              Backend Service (NestJS)        â”‚
                      â”‚                                              â”‚
                      â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
                      â”‚  â”‚   Voice Service    â”‚ â”‚   RAG Service    â”‚ â”‚
                      â”‚  â”‚  (Gemini Live Ephemâ”‚ â”‚  (FastEmbed BGE  â”‚ â”‚
                      â”‚  â”‚   Tokens & Tools)  â”‚ â”‚   small 384-dim) â”‚ â”‚
                      â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
                      â”‚            â”‚                     â”‚           â”‚
                      â”‚            â”‚ Tool: query_kb      â”‚ Cosine    â”‚
                      â”‚            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º     â”‚ Distance  â”‚
                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                         â”‚
                                                         â–¼
                                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                      â”‚   PostgreSQL + pgvector (384-dim)   â”‚
                                      â”‚   â€¢ kb_documents                    â”‚
                                      â”‚   â€¢ kb_chunks (vector index)        â”‚
                                      â”‚   â€¢ agents, conversations, calls    â”‚
                                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ“ Repository Structure

```text
D:\ORCA/
â”œâ”€â”€ backend/                         # NestJS Backend API & WebSocket Server
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ rag/                     # RAG core: chunkText & FastEmbed embedding generation
â”‚   â”‚   â”œâ”€â”€ kb/                      # Knowledge Base: file upload, parsers, pgvector queryKb
â”‚   â”‚   â”œâ”€â”€ website-ingestion/       # Playwright crawler & readability cleaner
â”‚   â”‚   â”œâ”€â”€ voice/                   # Gemini Live ephemeral token generation with RAG tools
â”‚   â”‚   â”œâ”€â”€ vobiz/                   # Telephony WebSocket audio streaming, converter & mixer
â”‚   â”‚   â”œâ”€â”€ telephony/               # Media bridge gateway (Twilio/telephony)
â”‚   â”‚   â”œâ”€â”€ vapi/                    # Vapi voice assistant integration (optional/legacy)
â”‚   â”‚   â”œâ”€â”€ llm/                     # Gemini/OpenAI text generation service & prompts
â”‚   â”‚   â”œâ”€â”€ conversation/            # Chat & call transcript tracking & session storage
â”‚   â”‚   â”œâ”€â”€ widget/                  # Backend endpoints for embeddable widget
â”‚   â”‚   â”œâ”€â”€ common/                  # Guards, decorators, cache, and text utilities
â”‚   â”‚   â”œâ”€â”€ prisma/                  # Prisma ORM service & client
â”‚   â”‚   â”œâ”€â”€ app.module.ts            # Root application module
â”‚   â”‚   â””â”€â”€ main.ts                  # NestJS entrypoint with WebSocket platform adapter
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â””â”€â”€ schema.prisma            # PostgreSQL schema with pgvector & RAG/Voice models
â”‚   â”œâ”€â”€ init.sql                     # SQL script: CREATE EXTENSION IF NOT EXISTS vector, pgcrypto
â”‚   â”œâ”€â”€ docker-compose.yml           # PostgreSQL container configured with pgvector
â”‚   â”œâ”€â”€ package.json                 # Backend dependencies
â”‚   â””â”€â”€ .env.example                 # Environment variables template
â”‚
â”œâ”€â”€ widget/                          # Standalone Embeddable Website Widget
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ voice.ts                 # Gemini Live client via AudioWorkletProcessor (raw PCM)
â”‚   â”‚   â”œâ”€â”€ main.ts                  # Floating widget UI, chat/voice toggling
â”‚   â”‚   â””â”€â”€ style.css                # Widget CSS styling
â”‚   â”œâ”€â”€ index.html                   # Test / embed demo page
â”‚   â”œâ”€â”€ package.json                 # Lightweight widget dependencies (@google/genai)
â”‚   â””â”€â”€ vite.config.ts               # Vite configuration to bundle a single widget.js
â”‚
â””â”€â”€ frontend-react/                  # React / Next.js Integration Components & Hooks
    â”œâ”€â”€ voice/
    â”‚   â”œâ”€â”€ useLiveSession.ts        # React hook for bidirectional Gemini Live audio streaming
    â”‚   â”œâ”€â”€ audioUtils.ts            # Web Audio PCM conversion & decoding utilities
    â”‚   â””â”€â”€ Orb.tsx                  # WebGL/OGL animated audio visualizer orb
    â”œâ”€â”€ knowledge-base/
    â”‚   â””â”€â”€ Knowledge.tsx            # Full UI for uploading documents & crawling websites
    â”œâ”€â”€ voice-agents/
    â”‚   â”œâ”€â”€ VoiceAgentBuilder.tsx    # Persona & voice configuration UI
    â”‚   â”œâ”€â”€ VoiceAgents.tsx          # Agent list dashboard
    â”‚   â””â”€â”€ Calls.tsx                # Call logs, transcripts, and audio playback UI
    â””â”€â”€ lib/
        â”œâ”€â”€ api.ts                   # Fetch API client
        â””â”€â”€ utils.ts                 # Classname & string helpers
```

---

## ðŸš€ Quickstart Guide

### Step 1: Database Setup (PostgreSQL with `pgvector`)

The RAG pipeline requires PostgreSQL with the `vector` extension enabled.

Using the included Docker Compose:
```bash
cd D:\ORCA\backend
docker compose up -d
```

This starts PostgreSQL on port `5432` and automatically runs `init.sql` which executes:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Step 2: Backend Configuration & Startup

1. Install dependencies:
   ```bash
   cd D:\ORCA\backend
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kaligan?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"

   # Gemini API Key (Required for Voice and Grounded LLM)
   GEMINI_API_KEY="your-gemini-api-key-here"
   VOICE_MODEL="gemini-3.1-flash-live-preview"

   # Optional for alternative providers
   OPENAI_API_KEY="optional"
   DEEPGRAM_API_KEY="optional"
   ```

3. Run database migrations:
   ```bash
   npx prisma db push
   # or
   npx prisma migrate dev
   ```

4. Start backend server:
   ```bash
   npm run start:dev
   ```

---

## ðŸ” How RAG Operates

1. **Ingestion (`backend/src/kb/` and `backend/src/website-ingestion/`)**:
   - Files (`.pdf`, `.docx`, `.doc`, `.xlsx`, `.pptx`, `.txt`) or crawled web pages are parsed into clean text.
   - Text is segmented into chunks using `ragService.chunkText(text, target=900, overlap=120)`. Overlap ensures semantic continuity across chunk boundaries.

2. **Vectorization (`backend/src/rag/rag.service.ts`)**:
   - Embeddings are generated locally using `fastembed` with the **`BAAI/bge-small-en-v1.5`** model (384 dimensions).
   - Chunks and their 384-dimensional vector embeddings are stored in the `kb_chunks` table with an indexed vector column.

3. **Semantic Querying (`backend/src/kb/kb.service.ts -> queryKb()`)**:
   - User query text is converted to a query vector using `fastembed.queryEmbed(text)`.
   - Cosine distance similarity search is executed directly in PostgreSQL via pgvector:
     ```sql
     SELECT c.content, d.name, 1 - (c.embedding <=> queryVector::vector) AS score
     FROM kb_chunks c
     JOIN kb_documents d ON c.document_id = d.id
     WHERE c.workspace_id = :workspaceId
     ORDER BY c.embedding <=> queryVector::vector
     LIMIT 5;
     ```

---

## ðŸŽ™ï¸ How Voice AI Operates

1. **Gemini Multimodal Live API**:
   - The backend `VoiceService` (`backend/src/voice/voice.service.ts`) requests an ephemeral connection token from Google GenAI (`client.authTokens.create`) configured with:
     - Model: `gemini-3.1-flash-live-preview`
     - Modality: Audio
     - Prebuilt voice: `Aoede` (friendly female), `Charon` (calm male), or `Kore`.
     - Tool Declaration: `query_knowledge_base` with a `query` parameter.
     - System instructions: Natural conversation constraints (concise, instant speaking).

2. **Client-side Audio Pipeline (`widget/src/voice.ts` or `frontend-react/voice/useLiveSession.ts`)**:
   - Uses Web Audio API with custom **`AudioWorkletProcessor`** (`PCMProcessor`) running on a dedicated audio thread.
   - Captures microphone input at 16kHz PCM 16-bit linear audio and streams it to Gemini Live.
   - Decodes incoming model audio chunks and plays them back sequentially with zero crackle or stutter.

3. **Autonomous RAG Tool Calling during Voice Calls**:
   - When the user asks a question about your products or company knowledge, Gemini triggers the `query_knowledge_base` function call.
   - The client/backend executes `kbService.queryKb()`, sends the retrieved text chunks back as the tool response, and Gemini seamlessly speaks the answer grounded in your documentation!

---

## ðŸŒ Integration Methods into Your Website

### Option A: Standalone Embeddable Widget (Any Website / HTML / WordPress / Shopify)

1. Build the widget bundle:
   ```bash
   cd D:\ORCA\widget
   npm install
   npm run build
   ```
2. Embed into any HTML page:
   ```html
   <!-- Include widget CSS -->
   <link rel="stylesheet" href="https://your-domain.com/widget.css" />

   <!-- Include widget script -->
   <script
     src="https://your-domain.com/widget.js"
     data-agent-id="YOUR_AGENT_UUID"
     data-api-url="https://your-backend-api.com"
     defer>
   </script>
   ```

### Option B: React / Next.js Direct Component Integration

Copy `frontend-react/` into your React/Next.js project:

```tsx
import React from 'react';
import { useLiveSession } from './frontend-react/voice/useLiveSession';
import { Orb } from './frontend-react/voice/Orb';

export function VoiceAssistant({ agentId }: { agentId: string }) {
  const {
    connectionState,
    connect,
    disconnect,
    isSpeaking,
    transcript,
    voiceLevel,
  } = useLiveSession({ agentId });

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <Orb voiceLevel={voiceLevel} enableVoiceControl={true} />

      <button
        onClick={connectionState === 'CONNECTED' ? disconnect : connect}
        className="px-6 py-3 rounded-full bg-emerald-600 text-white font-medium"
      >
        {connectionState === 'CONNECTED' ? 'End Conversation' : 'Start Voice Chat'}
      </button>

      <div className="max-w-md w-full space-y-2">
        {transcript.map((msg, i) => (
          <p key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <strong>{msg.role === 'user' ? 'You: ' : 'AI: '}</strong>
            {msg.content}
          </p>
        ))}
      </div>
    </div>
  );
}
```

---

## ðŸ“„ Key Environment Variables Reference

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with pgvector | `postgresql://postgres:postgres@localhost:5432/kaligan` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `VOICE_MODEL` | Live Multimodal model | `gemini-3.1-flash-live-preview` |
| `PORT` | Backend server port | `3000` |
| `JWT_SECRET` | Secret key for JWT auth tokens | `any-random-long-string` |
