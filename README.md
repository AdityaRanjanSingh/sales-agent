# AI Sales Assistant

An intelligent email automation system that monitors Gmail for customer brochure requests and automatically drafts professional responses with the appropriate marketing materials attached.

## Overview

This AI-powered sales assistant streamlines the process of handling customer inquiries for marketing materials by:

- **Monitoring Gmail** - Real-time webhook notifications for incoming customer emails
- **Understanding Requests** - AI analyzes email content to identify brochure/catalog needs
- **Retrieving Materials** - Automatically finds and attaches relevant brochures from storage
- **Drafting Responses** - Creates professional email drafts ready for review and sending
- **Manual Control** - Provides a chat interface for on-demand email processing

Built with Next.js, LangChain, and OpenAI GPT-4, this application combines modern AI orchestration with real-time email monitoring to create a practical business automation tool for sales teams.

## Features

### Automated Email Processing
- **Gmail Webhook Integration** - Receives push notifications when new emails arrive
- **Background Processing** - Automatically processes brochure requests without manual intervention
- **Smart Draft Creation** - Generates professional email responses with appropriate brochure attachments

### AI Sales Agent
- **Natural Language Understanding** - Comprehends customer requests in plain English
- **Multi-step Workflow** - Searches emails, reads content, retrieves brochures, and drafts responses
- **ReAct Pattern** - Uses LangGraph's reasoning and acting approach for intelligent decision-making
- **Streaming Responses** - Real-time feedback on agent actions and thinking

### Interactive Chat Interface
- **CopilotKit UI** - Modern conversational interface for manual operation
- **Tool Calling** - Execute Gmail operations and brochure retrieval through natural language
- **Action-based Architecture** - Clean separation of concerns with defined actions

### Gmail Integration
- **OAuth Authentication** - Secure Google sign-in via Clerk
- **Full Email Access** - Search, read, send, and create drafts
- **Thread Management** - Access entire email conversations for context
- **Token Management** - Automatic OAuth token refresh

### Brochure Management
- **Supabase Storage** - Centralized storage for marketing materials
- **Smart Matching** - Case-insensitive search for requested brochures
- **Public URLs** - Generate shareable links for email attachments

## Tech Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **AI Orchestration**: LangChain + LangGraph
- **LLM**: OpenAI GPT-4o-mini
- **Authentication**: Clerk (Google OAuth)
- **Storage**: Supabase
- **UI**: React 18, TailwindCSS, Radix UI, CopilotKit
- **Real-time**: Google Cloud Pub/Sub (Gmail webhooks)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Yarn package manager
- OpenAI API key
- Clerk account (for authentication)
- Supabase account (for brochure storage)
- Google Cloud project (for Gmail API and webhooks)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sales-agent
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and configure the following:

```bash
# Required: OpenAI
OPENAI_API_KEY="sk-..."

# Required: Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_SIGN_IN_URL="/sign-in"

# Required: Supabase Storage
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_PRIVATE_KEY="eyJ..."

# Required: LangChain
LANGCHAIN_CALLBACKS_BACKGROUND=false

# Optional: Gmail Webhook Security
GMAIL_WEBHOOK_TOKEN="random-secure-token"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

4. Run the development server:
```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) and sign in with Google

### Configuration Steps

#### 1. Clerk Setup (Authentication)

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Enable Google OAuth provider
4. Configure OAuth scopes in Clerk Dashboard → OAuth → Google:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Copy your publishable and secret keys to `.env.local`

#### 2. Supabase Setup (Brochure Storage)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a storage bucket named "brochures"
3. Set bucket policy to public or configure access as needed
4. Upload your marketing materials/brochures to the bucket
5. Copy your Supabase URL and service role key to `.env.local`

#### 3. Google Cloud Setup (Gmail Webhooks - Optional)

For automated email monitoring, set up Gmail push notifications:

1. Create a Google Cloud project
2. Enable Gmail API
3. Create a Pub/Sub topic (e.g., "gmail-notifications")
4. Grant Gmail API permission to publish to the topic
5. Create a push subscription pointing to `https://your-app.vercel.app/api/webhooks/gmail`
6. Use Gmail API's `watch()` method to enable push notifications
7. Add `GMAIL_WEBHOOK_TOKEN` to your environment variables for security

## Usage

### Manual Operation (Chat Interface)

1. Sign in with your Google account
2. Grant Gmail permissions when prompted
3. Use the chat interface to interact with the sales assistant

**Example commands:**
- "Search for unread emails about brochures"
- "Read the latest email from customer@example.com"
- "Find the product catalog brochure"
- "Create a draft response to the latest brochure request"

### Automated Operation (Webhooks)

Once Gmail webhooks are configured, the system will automatically:

1. Receive notification when a new email arrives
2. Analyze the email content for brochure requests
3. Retrieve the appropriate marketing materials
4. Draft a professional response with attachments
5. Save the draft to Gmail for review

The draft will be ready in your Gmail account for you to review and send.

## Project Structure

```
/app
  /(authenticated)
    layout.tsx              # Protected routes layout with navigation
    page.tsx                # Main sales assistant chat interface
  /api
    /chat
      /agents/route.ts      # LangGraph agent endpoint
    /webhooks
      /gmail/route.ts       # Gmail push notification handler
    /copilotkit/route.ts    # CopilotKit runtime endpoint
  /sign-in                  # Clerk authentication pages

/lib
  /gmail
    credentials.ts          # OAuth token management
    tools.ts                # Gmail tool factory
    process-emails.ts       # Background email processing
  /tools
    brochure.ts            # Brochure retrieval tool

/components
  GmailConnectionStatus.tsx # Gmail connection status indicator
  ui/                       # Radix UI components (dialog, popover, etc.)
```

## How It Works

### Architecture Overview

```
User Email → Gmail → Pub/Sub Webhook → /api/webhooks/gmail
  → Process Email Function → LangGraph Agent
  → Tools (Gmail Search, Read, Brochure Retrieval)
  → Create Draft Response → Gmail Drafts
```

### AI Agent Workflow

The sales assistant uses a ReAct (Reasoning + Acting) pattern:

1. **Receive Task** - User asks to process brochure requests or webhook triggers
2. **Search Emails** - Uses Gmail search to find relevant emails
3. **Read Content** - Retrieves full email content and metadata
4. **Understand Request** - AI analyzes what brochures are needed
5. **Retrieve Brochures** - Searches Supabase storage for matching files
6. **Draft Response** - Creates professional email with attachments
7. **Return Result** - Draft saved to Gmail for review

### Tools Available to the Agent

- **gmail_search** - Search for emails matching criteria
- **gmail_get_message** - Retrieve full email content
- **gmail_get_thread** - Get entire email conversation
- **gmail_create_draft** - Create draft email with attachments
- **gmail_send_message** - Send email directly (use with caution)
- **retrieve_brochure** - Search and retrieve brochures from Supabase

## Development

### Available Scripts

```bash
# Development server
yarn dev

# Production build
yarn build

# Start production server
yarn start

# Lint code
yarn lint

# Format code
yarn format

# Analyze bundle size
ANALYZE=true yarn build
```

### Adding Brochures

To add new marketing materials:

1. Log into your Supabase project
2. Navigate to Storage → brochures bucket
3. Upload PDF, image, or document files
4. The sales assistant will automatically find them by filename

### Customizing the Agent

The agent behavior can be customized in:

- **System Prompt**: `/app/api/copilotkit/route.ts` - Modify the instructions
- **Tools**: `/lib/gmail/tools.ts` and `/lib/tools/brochure.ts` - Add or modify tools
- **Model**: Change from GPT-4o-mini to other OpenAI models in the agent config

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

For Gmail webhooks to work in production:
- Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
- Update your Pub/Sub push subscription endpoint
- Ensure webhook token is configured

### Environment Variables in Production

Make sure to set all required environment variables in your Vercel project settings:
- OpenAI API key
- Clerk keys
- Supabase URL and key
- Gmail webhook token (if using webhooks)

## Security Considerations

- **OAuth Scopes**: Only request necessary Gmail permissions
- **Webhook Authentication**: Use `GMAIL_WEBHOOK_TOKEN` to verify webhook requests
- **Draft Review**: Emails are created as drafts by default, not sent automatically
- **Token Storage**: OAuth tokens are securely stored by Clerk
- **Environment Variables**: Never commit `.env.local` to version control

## Troubleshooting

### Gmail Connection Issues
- Verify OAuth scopes are configured correctly in Clerk
- Check that user has granted Gmail permissions
- Ensure OAuth tokens haven't expired (Clerk handles refresh automatically)

### Brochure Not Found
- Check Supabase bucket name is exactly "brochures"
- Verify files are uploaded and accessible
- Test with case-insensitive filename search

### Webhook Not Working
- Verify Pub/Sub topic and subscription are configured
- Check webhook URL is publicly accessible
- Ensure `GMAIL_WEBHOOK_TOKEN` matches in both webhook config and env vars
- Gmail watch expires after 7 days - must be renewed

## Bundle Size

This package has [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) set up. Explore the bundle size interactively:

```bash
ANALYZE=true yarn build
```

## Learn More

### Documentation
- [LangChain.js Documentation](https://js.langchain.com/docs/)
- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [CopilotKit Documentation](https://docs.copilotkit.ai/)

### Key Concepts
- [LangChain Agents](https://js.langchain.com/docs/tutorials/agents)
- [LangGraph ReAct Agent](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)

## License

This project is licensed under the terms specified in the LICENSE file.
