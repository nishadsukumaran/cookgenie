# CookGenie — AI-Powered Cooking Assistant

An intelligent cooking companion that helps you find the best recipes, adapt them to your needs, rescue dishes in real time, and learn your preferences over time.

## Features

- **🔥 Rescue Advice** — "My sauce is too salty!" Get instant, structured fixes with impact analysis
- **🔄 Smart Substitutions** — Missing an ingredient? Get ranked alternatives with taste/texture/authenticity scores
- **📐 Recipe Modifications** — "Reduce calories by 20%", "Make it vegan" — AI understands natural language
- **🔍 Recipe Discovery** — AI-powered search that generates and imports new recipes on demand
- **👤 User Profiles** — Google sign-in with personalized spice, dietary, and cuisine preferences
- **📊 Trust Metrics** — Every modification shows confidence, risk, and authenticity scores
- **📱 PWA Support** — Installable on mobile with offline caching via Serwist

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (next-auth beta) + Google OAuth |
| AI | Vercel AI SDK + AI Gateway (Claude Sonnet 4.6) |
| Images | Vercel Blob Storage |
| PWA | Serwist (Service Worker) |

## Getting Started

### Prerequisites

- Node.js 22+
- A Neon PostgreSQL database (via [Vercel Marketplace](https://vercel.com/marketplace/neon))
- Google OAuth credentials (see below)
- Vercel AI Gateway setup (for AI features)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required values:

```env
# Database (from Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Google OAuth (see Setup Guide below)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Auth.js session encryption
AUTH_SECRET="<run: openssl rand -base64 32>"
```

### 3. Set Up the Database

Push the schema to Neon:

```bash
npm run db:push
```

Seed initial data (5 recipes, substitution knowledge):

```bash
npm run db:seed
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Setup

CookGenie uses Google OAuth for user authentication. Here's how to set it up:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google+ API**

### 2. Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Select **Web application** as the application type
4. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
5. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add to your `.env.local` (local) or Vercel Environment Variables (production):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_SECRET=<generate-with: openssl rand -base64 32>
```

### 4. Push Database Schema

The authentication system requires new tables:

```bash
npm run db:push
```

This creates: `users`, `accounts`, `sessions`, `verification_tokens` tables.

### First Login Flow

1. Navigate to **Profile** tab
2. Tap **Sign in with Google**
3. Complete Google OAuth
4. You'll be redirected to the **Onboarding Wizard**:
   - Choose your spice level
   - Select dietary restrictions
   - Pick favorite cuisines
   - Choose measurement system
5. After onboarding, you're redirected to the home page

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run db:seed` | Seed database with initial data |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (17 endpoints)
│   │   ├── auth/           # Auth.js handlers
│   │   ├── recipes/        # Recipe CRUD + search
│   │   ├── sessions/       # Cooking session tracking
│   │   └── ...             # Other API routes
│   ├── onboarding/         # User onboarding wizard
│   ├── login/              # Google sign-in page
│   ├── profile/            # User profile (auth-aware)
│   ├── recipe/[id]/        # Recipe detail
│   ├── cook/[id]/          # Cook mode
│   ├── ask/                # AI chat interface
│   ├── saved/              # Saved recipes + variants
│   └── search/             # Recipe search + discovery
├── components/
│   ├── ai/                 # AI response cards, chat
│   ├── recipe/             # Recipe cards, badges, sheets
│   ├── search/             # Search input, results
│   ├── layout/             # Header, bottom nav
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── auth/               # Auth.js config, session helpers
│   ├── ai/                 # AI client (Vercel AI SDK)
│   ├── db/                 # Drizzle schema + queries
│   ├── engines/            # Core intelligence:
│   │   ├── substitution/   # Ingredient substitution engine
│   │   ├── transformation/ # Scaling, calorie adjustment
│   │   ├── recipe-edit/    # Structured recipe editing
│   │   └── learning/       # Confidence adjustment, personalization
│   └── hybrid/             # Intent detection, controller
├── data/
│   └── mock-data.ts        # Seeded recipes (butter chicken, etc.)
└── hooks/                  # Custom React hooks
```

## Architecture Highlights

### Hybrid Intelligence Pipeline

```
User Input → Intent Detection → Engine Selection → Response
     ↓              ↓                  ↓              ↓
  Free text     Classify intent    Route to       AI explanation
  ("too salty") (rescue/edit/      appropriate    + impact analysis
                 substitution)     engine
```

### Trust Metrics

Every modification is scored on:
- **Confidence** (0-100) — How sure are we this works?
- **Risk** (Low/Med/High) — What could go wrong?
- **Authenticity** (0-100) — How true to the original is it?

Scaling does NOT affect trust scores — doubling a recipe preserves taste and authenticity.

### Data Flow

```
Neon DB → Drizzle ORM → API Routes → Client Components
                ↑
        Auth.js (session)
```

## Deploying to Vercel

### 1. Push to Git

```bash
git add . && git commit -m "feat: authentication and onboarding"
git push
```

### 2. Connect to Vercel

1. Import your repo on [Vercel](https://vercel.com)
2. The Next.js preset auto-detects the framework
3. Add environment variables:
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
4. Deploy

### 3. Post-Deploy

```bash
# Push DB schema to production
npx dotenv -e .env.production -- drizzle-kit push

# Seed initial data
npx dotenv -e .env.production -- npx tsx scripts/seed.ts
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js Documentation](https://authjs.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Neon Database](https://neon.tech/)
