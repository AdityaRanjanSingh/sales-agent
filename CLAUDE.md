# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js AI sales assistant application that automates email brochure requests. It integrates Gmail via OAuth (through Clerk), LangChain/LangGraph for agentic workflows, and CopilotKit for the chat interface. The system monitors incoming emails for brochure requests, retrieves brochures from Supabase storage, and drafts professional responses with attachments.

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript
- LangChain.js + LangGraph for AI agents
- CopilotKit for chat UI
- Clerk for authentication & OAuth
- Google Gmail API via OAuth
- NeonDB (PostgreSQL) for user preferences
- Prisma ORM
- Supabase for storage (brochures bucket)
- OpenAI GPT-4o-mini for LLM
- Tailwind CSS + shadcn/ui components
- Yarn (v3.5.1)

## Development Commands

```bash
# Install dependencies
yarn

# Run development server (http://localhost:3000)
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Lint code
yarn lint

# Format code
yarn format

# Analyze bundle size
ANALYZE=true yarn build

# Database migrations (Prisma)
yarn prisma migrate dev    # Create and run new migrations
yarn prisma generate       # Generate Prisma client
yarn prisma studio        # Open database browser
```

## Architecture

### Authentication & OAuth Flow
- **Clerk** handles all authentication and Google OAuth
- Users sign in with Google to grant Gmail access
- OAuth tokens are managed by Clerk and auto-refreshed
- `lib/gmail/credentials.ts` provides two functions:
  - `getGmailAccessTokenFunction()`: For authenticated routes (uses `auth()`)
  - `getGmailAccessTokenFunctionForUser(userId)`: For webhooks (no auth context)
- All Gmail API access requires a valid OAuth token from Clerk

### AI Agent System
The system uses LangGraph's `createReactAgent` to build sales assistant agents:

1. **Agent Route** (`app/api/chat/agents/route.ts`):
   - Traditional LangChain agent with streaming
   - Used for interactive chat scenarios
   - Streams tokens via AI SDK

2. **CopilotKit Route** (`app/api/copilotkit/route.ts`):
   - CopilotKit-based implementation with actions
   - Powers the main UI (`app/(authenticated)/page.tsx`)
   - Same capabilities as agent route but with CopilotKit framework

Both agents have identical tools and system prompts defined in their respective files.

### Gmail Integration
**Tools** (`lib/gmail/tools.ts`):
- `createGmailTools(getAccessToken)`: Factory function creating LangChain Gmail tools
- Available tools: search, getMessage, getThread, createDraft, sendMessage
- All tools use dynamic OAuth tokens via the `getAccessToken` function

**Email Processing** (`lib/gmail/process-emails.ts`):
- `processNewEmails()`: Invoked by webhook when new emails arrive
- Creates an agent that searches for brochure requests, retrieves brochures, and drafts responses
- `getUserIdFromEmail()`: Maps Gmail addresses to Clerk user IDs

**Webhook** (`app/api/webhooks/gmail/route.ts`):
- Receives Gmail push notifications via Google Cloud Pub/Sub
- Validates requests using `GMAIL_WEBHOOK_TOKEN`
- Decodes notification, finds user, and triggers background email processing
- Always returns 200 to prevent Google retries
- Comprehensive logging with request IDs for debugging

### Brochure Retrieval
`lib/tools/brochure.ts` - `BrochureRetrieverTool`:
- Searches Supabase `brochures` bucket for matching files
- Case-insensitive partial matching on file names
- Returns public URLs and metadata for email attachments
- Lists available brochures if requested file not found

### User Preferences & Custom Instructions
**Database** (`prisma/schema.prisma`):
- `UserPreferences` model stores user-specific settings
- Fields: `userId`, `customInstructions`, timestamps
- NeonDB PostgreSQL database via Prisma ORM

**API Routes** (`app/api/user-preferences/route.ts`):
- GET: Fetch current user's custom instructions
- POST: Save/update custom instructions
- Authenticated via Clerk `auth()`

**UI Integration** (`app/(authenticated)/page.tsx`):
- `SettingsDrawer` component provides settings UI (gear icon, slide-in drawer)
- Custom instructions fetched on page load
- `useCopilotReadable` hook injects instructions into agent context
- Instructions only apply to CopilotKit chat, not webhook email processing

**Flow:**
1. User clicks settings icon → drawer opens
2. User enters custom instructions (e.g., "Always be concise")
3. Saves → stored in NeonDB via API
4. Instructions immediately available to agent via `useCopilotReadable`
5. Agent incorporates instructions in all chat responses

### UI Components
- `components/ChatWindow.tsx`: Main chat interface (legacy, not currently used)
- `components/GmailConnectionStatus.tsx`: Shows Gmail connection status
- `components/SettingsDrawer.tsx`: Settings drawer for custom instructions
- `app/(authenticated)/page.tsx`: Main app page using CopilotKit chat
- `components/ui/*`: shadcn/ui components

### Route Protection
`middleware.ts`: All routes except `/sign-in` and `/sign-up` require Clerk authentication.

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY`: OpenAI API key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `CLERK_SECRET_KEY`: Clerk secret key
- `DATABASE_URL`: NeonDB PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_PRIVATE_KEY`: Supabase service role key
- `GMAIL_WEBHOOK_TOKEN`: Secret token for webhook security
- `LANGCHAIN_CALLBACKS_BACKGROUND=false`: Required for Edge functions

See `.env.example` for complete list.

## Key Patterns

### OAuth Token Handling
Always use the factory functions from `lib/gmail/credentials.ts`:
```typescript
// In authenticated routes
const getAccessToken = await getGmailAccessTokenFunction();

// In webhooks (no auth context)
const getAccessToken = await getGmailAccessTokenFunctionForUser(userId);

// Then create tools
const gmailTools = createGmailTools(getAccessToken);
```

### Agent System Prompt
The sales assistant prompt is duplicated in:
- `lib/gmail/process-emails.ts` (webhook processing)
- `app/api/chat/agents/route.ts` (chat agent)
- `app/api/copilotkit/route.ts` (CopilotKit)

If updating the prompt, update all three locations.

### Prisma & Database
Database client is initialized in `lib/prisma.ts` as a singleton:
```typescript
import { prisma } from "@/lib/prisma";

// Query user preferences
const preferences = await prisma.userPreferences.findUnique({
  where: { userId },
});

// Upsert (create or update)
await prisma.userPreferences.upsert({
  where: { userId },
  update: { customInstructions },
  create: { userId, customInstructions },
});
```

After schema changes, run:
1. `yarn prisma generate` - Regenerate client
2. `yarn prisma migrate dev` - Create and run migration

### Error Handling
- Gmail tools and OAuth token retrieval include comprehensive error logging
- Webhook returns 200 even on errors to prevent Google retries
- All logs include context (error message, stack, request IDs)

## Important Notes

- This project uses Next.js App Router (not Pages Router)
- The agent route uses `runtime = "nodejs"` (not edge) for Gmail API compatibility
- Simple chat route (`app/api/chat/route.ts`) is a basic example, not used in production
- Path alias `@/*` maps to project root
- Gmail push notifications require Google Cloud Pub/Sub setup (see webhook comments)
- Brochures must be manually uploaded to Supabase `brochures` bucket
- Clerk must be configured with Google OAuth provider and appropriate scopes (Gmail API access)
- **Database Setup**: Before running the app, you must:
  1. Create a NeonDB PostgreSQL database
  2. Add `DATABASE_URL` to `.env.local`
  3. Run `yarn prisma migrate dev` to create tables
  4. Run `yarn prisma generate` to generate the Prisma client
