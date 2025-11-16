# AI Sales Assistant

An intelligent email management system that helps sales teams handle customer communications efficiently. The AI assistant monitors Gmail, provides intelligent context from knowledge bases and documents, and helps draft professional responses to customer inquiries.

## Overview

This AI-powered sales assistant streamlines customer communication workflows by:

- **Monitoring Gmail** - Real-time webhook notifications for incoming customer emails
- **Understanding Requests** - AI analyzes email content to identify customer needs and questions
- **Providing Context** - Queries company knowledge base and reads Google Drive documents for accurate information
- **Drafting Responses** - Creates professional, personalized email drafts with relevant context
- **Interactive Chat** - Provides a conversational interface for on-demand email management

Built with Next.js, LangChain, and OpenAI GPT-4, this application combines modern AI orchestration with real-time email monitoring to create a practical business automation tool for sales teams.

## Features

### Automated Email Processing
- **Gmail Webhook Integration** - Receives push notifications when new emails arrive
- **Background Processing** - Automatically processes customer inquiries without manual intervention
- **Smart Draft Creation** - Generates professional email responses with contextual information
- **Custom Instructions** - User-configurable preferences for response style and behavior

### AI Sales Agent
- **Natural Language Understanding** - Comprehends customer requests in plain English
- **Multi-step Workflow** - Searches emails, reads content, gathers context, and drafts responses
- **Knowledge Base Integration** - Queries company information (pricing, policies, products, support)
- **ReAct Pattern** - Uses LangGraph's reasoning and acting approach for intelligent decision-making
- **Streaming Responses** - Real-time feedback on agent actions and thinking

### Interactive Chat Interface
- **CopilotKit UI** - Modern conversational interface for manual operation
- **Tool Calling** - Execute Gmail and Drive operations through natural language
- **Action-based Architecture** - Clean separation of concerns with defined actions
- **Two-Step Confirmation** - Review and approve email drafts before creation

### Gmail & Drive Integration
- **OAuth Authentication** - Secure Google sign-in via Clerk
- **Full Email Access** - Search, read, send, and create drafts
- **Thread Management** - Access entire email conversations for context
- **Google Drive** - Read company documents (Docs/Sheets) for up-to-date information
- **Token Management** - Automatic OAuth token refresh

### Knowledge Base
- **Built-in Knowledge** - Company information stored in the application
- **Semantic Search** - Find relevant information based on customer questions
- **Extensible** - Easy to add custom company data and policies

## Tech Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **AI Orchestration**: LangChain + LangGraph
- **LLM**: OpenAI GPT-4o-mini
- **Authentication**: Clerk (Google OAuth)
- **Database**: PostgreSQL with Prisma ORM (Docker local or NeonDB cloud)
- **UI**: React 18, TailwindCSS, Radix UI, CopilotKit
- **Real-time**: Google Cloud Pub/Sub (Gmail webhooks - optional)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Yarn package manager
- Docker and Docker Compose (for local database)
- OpenAI API key
- Clerk account (for authentication)
- NeonDB account (optional - for cloud database)
- Google Cloud project (for Gmail API and optional webhooks)

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

# Required: Database (use local PostgreSQL by default)
DATABASE_URL="postgresql://salesagent:salesagent_dev@localhost:5432/sales_agent"

# Required: LangChain
LANGCHAIN_CALLBACKS_BACKGROUND=false

# Optional: Gmail Webhook Security
GMAIL_WEBHOOK_TOKEN="random-secure-token"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

4. Start the local PostgreSQL database:
```bash
yarn db:start
```

5. Run database migrations:
```bash
yarn db:migrate
```

6. Run the development server:
```bash
yarn dev
```

7. Open [http://localhost:3000](http://localhost:3000) and sign in with Google

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
   - `https://www.googleapis.com/auth/drive.readonly`
5. Copy your publishable and secret keys to `.env.local`

#### 2. Database Setup

**Option A: Local PostgreSQL (Recommended for Development)**

The project includes Docker Compose configuration for running PostgreSQL locally.

1. Ensure Docker Desktop is installed and running
2. Start the database:
   ```bash
   yarn db:start
   ```
3. Run database migrations:
   ```bash
   yarn db:migrate
   ```
4. (Optional) Open Prisma Studio to browse the database:
   ```bash
   yarn db:studio
   ```

**Database Management Scripts:**
- `yarn db:start` - Start PostgreSQL container
- `yarn db:stop` - Stop PostgreSQL container
- `yarn db:reset` - Reset database (drops all data and re-runs migrations)
- `yarn db:migrate` - Run pending migrations
- `yarn db:generate` - Generate Prisma client
- `yarn db:studio` - Open Prisma Studio GUI
- `yarn db:push` - Push schema changes without migrations (dev only)

**Option B: NeonDB (Cloud PostgreSQL)**

For production or if you prefer a cloud database:

1. Create a NeonDB project at [neon.tech](https://neon.tech)
2. Copy your PostgreSQL connection string
3. Update `DATABASE_URL` in `.env.local`:
   ```bash
   DATABASE_URL="postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require"
   ```
4. Run database migrations:
   ```bash
   yarn db:migrate
   ```

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
- "Search for unread emails from customers"
- "Read the latest email from customer@example.com"
- "Reply to john@acme.com about pricing"
- "Check for emails that need responses"
- "Read the pricing document from Google Drive"

### Automated Operation (Webhooks)

Once Gmail webhooks are configured, the system will automatically:

1. Receive notification when a new email arrives
2. Analyze the email content to understand customer needs
3. Query knowledge base and Google Drive for relevant information
4. Draft a professional response with contextual information
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
  /drive
    credentials.ts          # Drive OAuth token management
    tools.ts                # Google Drive tool factory
  /tools
    knowledge-base.ts       # Company knowledge base tool
  prisma.ts                 # Database client singleton
  preferences.ts            # User preferences utilities

/components
  GmailConnectionStatus.tsx # Gmail connection status indicator
  SettingsDrawer.tsx        # Custom instructions settings
  ui/                       # Radix UI components (dialog, popover, etc.)

/prisma
  schema.prisma             # Database schema
```

## How It Works

### Architecture Overview

```
User Email → Gmail → Pub/Sub Webhook → /api/webhooks/gmail
  → Process Email Function → LangGraph Agent
  → Tools (Gmail, Drive, Knowledge Base)
  → Create Draft Response → Gmail Drafts
```

### AI Agent Workflow

The sales assistant uses a ReAct (Reasoning + Acting) pattern:

1. **Receive Task** - User asks to handle emails or webhook triggers
2. **Search Emails** - Uses Gmail search to find relevant emails
3. **Read Content** - Retrieves full email content and metadata
4. **Understand Request** - AI analyzes customer needs and questions
5. **Gather Context** - Queries knowledge base and reads Google Drive documents
6. **Draft Response** - Creates professional email with accurate information
7. **Return Result** - Draft saved to Gmail for review

### Tools Available to the Agent

- **gmail_search** - Search for emails matching criteria
- **gmail_get_message** - Retrieve full email content
- **gmail_get_thread** - Get entire email conversation
- **gmail_create_draft** - Create draft email with attachments
- **gmail_send_message** - Send email directly (use with caution)
- **prepare_email_reply** - Draft contextual replies with customer history
- **confirm_email_reply** - Confirm and create draft after review
- **drive_read_document** - Read Google Docs and Sheets
- **knowledge_base** - Query company information (pricing, policies, etc.)

## Development

### Available Scripts

**Application:**
```bash
yarn dev                # Development server
yarn build              # Production build
yarn start              # Start production server
yarn lint               # Lint code
yarn format             # Format code
ANALYZE=true yarn build # Analyze bundle size
```

**Database:**
```bash
yarn db:start           # Start local PostgreSQL (Docker)
yarn db:stop            # Stop local PostgreSQL
yarn db:reset           # Reset database (WARNING: deletes all data)
yarn db:migrate         # Run database migrations
yarn db:generate        # Generate Prisma client
yarn db:studio          # Open Prisma Studio GUI
yarn db:push            # Push schema without migrations
```

### Customizing the Knowledge Base

To add company-specific information:

1. Edit `lib/tools/knowledge-base.ts`
2. Add new entries to the `knowledgeArticles` array
3. Include category, question, answer, and keywords
4. The agent will automatically search and use this information

### Customizing the Agent

The agent behavior can be customized in:

- **System Prompt**: `/app/api/copilotkit/config/instructions.ts` - Modify the instructions
- **Tools**: Create new tools in `/lib/tools/` following the LangChain pattern
- **Model**: Change from GPT-4o-mini to other OpenAI models in the agent config
- **User Preferences**: Users can set custom instructions via the settings drawer

### Extending Functionality

Add new capabilities by:

1. **Creating Tools**: Build LangChain tools in `/lib/tools/`
2. **Adding Actions**: Create CopilotKit actions in `/app/api/copilotkit/tools/`
3. **Integrating APIs**: Follow the OAuth pattern in `/lib/gmail/` and `/lib/drive/`
4. **Updating Knowledge**: Extend the knowledge base with company data

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
- NeonDB database URL
- Gmail webhook token (if using webhooks)

## Security Considerations

- **OAuth Scopes**: Only request necessary Gmail permissions
- **Webhook Authentication**: Use `GMAIL_WEBHOOK_TOKEN` to verify webhook requests
- **Draft Review**: Emails are created as drafts by default, not sent automatically
- **Token Storage**: OAuth tokens are securely stored by Clerk
- **Environment Variables**: Never commit `.env.local` to version control

## Database Configuration

### Local vs Cloud Database

The project supports both local PostgreSQL (via Docker) and cloud PostgreSQL (NeonDB).

**Local PostgreSQL (Development):**
- Pros: Faster, works offline, no cost, instant setup
- Cons: Requires Docker, data only on your machine
- Best for: Local development and testing

**NeonDB (Production/Cloud):**
- Pros: Managed service, automatic backups, scalable, accessible anywhere
- Cons: Requires internet, has cost (free tier available)
- Best for: Production, staging, team collaboration

### Switching Databases

To switch between local and cloud databases, simply update `DATABASE_URL` in `.env.local`:

**Switch to Local:**
```bash
DATABASE_URL="postgresql://salesagent:salesagent_dev@localhost:5432/sales_agent"
```

**Switch to NeonDB:**
```bash
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require"
```

After switching, run:
```bash
yarn db:generate  # Regenerate Prisma client
yarn db:migrate   # Apply any pending migrations
```

### Docker Configuration

The database credentials can be customized in `.env.local`:

```bash
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database_name
```

If you change these, update the `DATABASE_URL` accordingly:
```bash
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/your_database_name"
```

## Troubleshooting

### Gmail Connection Issues
- Verify OAuth scopes are configured correctly in Clerk (Gmail + Drive)
- Check that user has granted Gmail and Drive permissions
- Ensure OAuth tokens haven't expired (Clerk handles refresh automatically)

### Knowledge Base Not Working
- Check `lib/tools/knowledge-base.ts` has valid entries
- Verify keywords match customer queries
- Test semantic search with different query terms

### Database Issues

**Local PostgreSQL:**
- Ensure Docker Desktop is running
- Check database container is running: `docker ps`
- Restart database: `yarn db:stop && yarn db:start`
- Reset database if corrupted: `yarn db:reset` (WARNING: deletes all data)
- Check logs: `docker logs sales-agent-db`

**NeonDB (Cloud):**
- Ensure `DATABASE_URL` is correctly set in `.env.local`
- Run `yarn db:migrate` to apply migrations
- Check NeonDB project is active and accessible
- Verify SSL mode is set correctly in connection string

**General:**
- Ensure Prisma client is generated: `yarn db:generate`
- Check migrations have run: `yarn db:migrate`
- View database in Prisma Studio: `yarn db:studio`

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
