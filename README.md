# Bailey

A cross-platform web application for competitive policy debate flowing. Replaces legacy tools like Microsoft Word and Excel with a purpose-built interface that works on macOS, Windows, and tablets.

## Features

- **Flow Grid**: 8-column grid for all policy debate speeches (1AC through 2AR)
- **Cell Formatting**: Bold, underline, and color highlighting (yellow, green, blue)
- **Drag and Drop**: Reorder arguments vertically or align responses across columns
- **Tab Management**: Multiple flow tabs per round (one per position)
- **Tournament/Round Organization**: Hierarchical tournament > round > flow structure
- **Speech Timer**: Countdown timer with presets for constructives, rebuttals, cross-ex, and prep time
- **Import/Export**: Back up and restore tournament data as JSON
- **Keyboard Navigation**: Arrow keys, Tab, Enter/Escape, undo/redo (Ctrl+Z)
- **Authentication**: User accounts via Supabase Auth with Row Level Security

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Package Manager**: Bun

## Setup

### 1. Supabase Project

Create a Supabase project at [supabase.com](https://supabase.com), then run the SQL in `client/src/db/schema.sql` in the Supabase SQL Editor to create the database tables and policies.

### 2. Environment Variables

Create `client/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and Run

```bash
bun install
bun run dev
```

The app runs at `http://localhost:3000`.

## Project Structure

```
client/src/
  auth/       # Authentication context, login/signup pages
  db/         # Supabase client, API layer, types, schema SQL
  hooks/      # React hooks (tournaments, rounds, flow grid, timer, undo/redo)
  components/ # Reusable UI components
  pages/      # Route-level page components
```

## Database Schema

Four tables with Row Level Security:

- `tournaments` - Competition events
- `rounds` - Individual debates within a tournament
- `flow_tabs` - Position flows within a round (tabs)
- `flow_cells` - Argument entries within a flow grid
