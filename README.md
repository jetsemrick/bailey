# Debate Flow Application

A web-based application for judging policy debates with organized note-taking (flowing), timer, and document preview capabilities.

## Features

- **Flow Grid**: 7-column grid for debate speeches (1AC, 1NC, 2AC, Block, 1AR, 2NR, 2AR)
- **Multiple Sheets**: Create, rename, and manage multiple flow sheets per debate
- **Auto-save**: Cell changes are automatically saved to the backend
- **Color-coded Columns**: Visual distinction between affirmative and negative speeches

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL database with auto-generated REST API)

## Prerequisites

- Bun (recommended) or Node.js 18+
- Supabase account (project already set up)

## Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Set up environment variables**:
   - Copy `client/.env.example` to `client/.env`
   - The Supabase credentials are already configured for the "Bailey" project

3. **Start the development server**:
```bash
bun run dev
```

This runs both the client and server (workspaces) in watch mode.
   
If you only want one workspace:

```bash
bun --cwd client run dev
```

```bash
bun --cwd server run dev
```

## Project Structure

```
bailey/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── api/         # Supabase API client
│   │   └── lib/          # Supabase client setup
└── package.json     # Root workspace config
```

## Database Schema

The Supabase database includes three tables:
- `flows` - Debate flow documents
- `sheets` - Individual sheets within a flow
- `cells` - Individual cells within a sheet

All tables have Row Level Security (RLS) enabled with permissive policies for now.

## Development

- Dev (client + server): `bun run dev`
- Client only: `bun --cwd client run dev`
- Server only: `bun --cwd server run dev`
- Database management: Use Supabase Dashboard at https://supabase.com/dashboard


