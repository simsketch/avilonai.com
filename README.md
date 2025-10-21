# Avilon - AI Therapy Bot POC

A minimal proof-of-concept AI therapy chatbot using Next.js, Supabase, and OpenRouter.

## Features

- **Intake Wizard**: 5-question assessment including PHQ-2 and GAD-2 screening
- **AI Chat**: Context-aware therapy conversations using CBT techniques
- **Two Therapy Modes**:
  - Quick check-in (unstructured chat)
  - Guided CBT exercises (thought challenging, deep breathing, grounding)
- **Crisis Detection**: Automatic keyword detection with crisis resources
- **Dashboard**: Session history, mood trends, and progress tracking
- **Memory System**: Stores last 10 messages + patient profile for context

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL with pgvector
- **AI**: OpenRouter (deepseek/deepseek-r1-distill-llama-70b at $0.27/1M tokens)
- **Auth**: NextAuth.js with Supabase
- **Deployment**: Vercel (free tier)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd avilonai.com
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a project at [https://supabase.com](https://supabase.com)
2. Go to SQL Editor and execute the schema from `lib/db/schema.sql`
3. Copy your project URL and keys from Settings > API

### 4. Set up OpenRouter

1. Create an account at [https://openrouter.ai](https://openrouter.ai)
2. Generate an API key from the dashboard
3. Add credits to your account ($5-10 is sufficient for POC testing)

### 5. Configure environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations)
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
- `NEXTAUTH_SECRET`: Random secret (generate with `openssl rand -base64 32`)
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `NEXT_PUBLIC_APP_URL`: Your app URL

### 6. Run the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Usage Flow

1. **Sign Up**: Create an account at `/signup`
2. **Complete Intake**: Fill out the 5-step intake wizard
3. **Start Session**: Choose session type and rate your mood
4. **Chat**: Engage with Avilon using CBT techniques
5. **Dashboard**: View your session history and mood trends

## Crisis Detection

The system automatically detects crisis keywords and provides immediate resources:
- 988 Suicide & Crisis Lifeline
- Crisis Text Line (741741)
- Emergency room guidance

All incidents are logged for safety monitoring.

## Cost Estimate

- **Infrastructure**: $0 (Vercel + Supabase free tiers)
- **LLM Costs**: ~$5-10/month for 100-200 conversations
- **Total**: Under $10/month for POC

## Project Structure

```
/app
  /api
    /auth          # Authentication endpoints
    /chat          # Chat and session endpoints
    /intake        # Intake form submission
    /dashboard     # Dashboard data
  /(auth)          # Login and signup pages
  /(dashboard)     # Protected dashboard pages
/components
  /chat            # Chat interface
  /intake          # Intake wizard
  /ui              # shadcn/ui components
/lib
  /ai              # AI agent configuration
  /db              # Database schema and client
  /utils           # Utilities (crisis detection, etc.)
```

## Security & Privacy

- User authentication via NextAuth.js + Supabase
- Environment variables for API keys
- Server-side API routes for sensitive operations
- Crisis incidents logged for safety

## Important Notes

⚠️ **This is a POC for educational purposes only.**

- Not a replacement for professional mental health care
- Not HIPAA compliant
- Not suitable for production use without additional security and compliance measures
- Crisis detection is keyword-based and may have false positives/negatives

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
