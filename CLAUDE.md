# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A themed song voting platform where registered users create quizzes, share them via UUID links, and anonymous voters submit songs and vote through distinct phases. Supports multiple concurrent quizzes with historical statistics.

**Tech Stack**: Node.js + Express, SQLite3, Vanilla JavaScript (no framework), Chart.js (CDN)

**Default Port**: 3001 (set in server.js:9)

## Development Commands

```bash
# Install dependencies
npm install

# Start server
npm start
# or
npm run dev

# Both commands run: node server.js
# Server runs on http://localhost:3001
```

## Application Architecture

### Phase-Based Quiz System

Each quiz operates through a strict 4-phase workflow controlled by its owner:

- **Phase 0 (Setup)**: Quiz created with a theme and optional theme image
- **Phase 1 (Submission)**: Voters submit songs with their name, song details, and streaming links
- **Phase 2 (Voting)**: Voters assign 3/2/1 points to songs - submitters are hidden
- **Phase 3 (Results)**: Display ranked results with submitter names revealed, `completed_at` set

**Multi-quiz**: Multiple quizzes can exist simultaneously. Each has a UUID used in shareable links. Old quizzes are preserved (not deleted) for historical statistics.

### Database Schema (SQLite)

File: `database.db` (created automatically in project root)

**Tables**:
- `accounts`: Registered quiz creators (id UUID, username, email, password_hash via bcryptjs, display_name)
- `sessions`: Server-side session tokens (id UUID, account_id, expires_at) - 7-day expiry
- `quizzes`: Quiz instances (id UUID, owner_id, theme, theme_image, phase, timers, created_at, completed_at)
- `songs`: Submitted songs linked to quiz_id and user_id
- `votes`: User votes with points (1/2/3) - UNIQUE(quiz_id, user_id, points)
- `users`: Anonymous voter tracking via UUID cookies

**Important Query Patterns**:
- All database operations are Promise-wrapped in `database.js` exports
- Use `queries.getQuiz(quizId)` to get a quiz by UUID
- Use `queries.getQuizzesByOwner(ownerId)` for dashboard listing
- Statistics queries: `getAllTimeLeaderboard()`, `getSubmitterStats()`, `getParticipationTrends()`

### Authentication & User Management

**Two user types**:
1. **Registered accounts** (quiz creators): username/password login, bcryptjs hashed, server-side sessions via `sessionToken` cookie
2. **Anonymous voters**: UUID cookie (`userId`, 30-day expiry) - no account needed

**Middleware**:
- `ensureUser`: Generates/retrieves anonymous voter UUID cookie
- `ensureAuth`: Validates `sessionToken` cookie against sessions table, sets `req.account`
- `ensureQuizOwner`: Used after `ensureAuth`, checks quiz ownership, sets `req.quiz`

### Route Organization

- **`routes/auth.js`**: Registration, login, logout, session check (`/api/auth/*`)
- **`routes/quiz.js`**: Quiz CRUD, phase management (`/api/quiz/*`) - requires `ensureAuth`
  - Uses multer for theme image uploads (5MB limit, images only)
- **`routes/songs.js`**: Song submission and listing (`/api/songs/*`) - uses `ensureUser`, accepts `quizId`
- **`routes/votes.js`**: Vote submission, results, badges (`/api/votes/*`) - uses `ensureUser`, accepts `quizId`
- **`routes/stats.js`**: Per-quiz and cross-quiz statistics (`/api/stats/*`) - requires `ensureAuth`

### Frontend Structure

Four main views:

1. **`public/index.html` + `app.js`**: Voter interface - requires `?quiz=<uuid>` URL param; shows landing page without it
2. **`public/dashboard.html` + `dashboard.js`**: Owner dashboard - login/register, create/manage quizzes, phase control
3. **`public/presentation.html` + `presentation.js`**: Read-only display view - requires `?quiz=<uuid>` URL param
4. **`public/stats.html` + `stats.js`**: Statistics with Chart.js graphs - `?quiz=<uuid>` for per-quiz, none for overview

### URL Structure

| URL | Purpose |
|---|---|
| `/?quiz=<uuid>` | Voter view for a specific quiz |
| `/` | Landing page (redirects to dashboard if logged in) |
| `/dashboard` | Owner dashboard (login/register + quiz management) |
| `/presentation?quiz=<uuid>` | Presentation display for a quiz |
| `/stats?quiz=<uuid>` | Per-quiz statistics with charts |
| `/stats` | Cross-quiz overview and leaderboard |
| `/admin` | Redirects to `/dashboard` (legacy) |

### Key Implementation Details

**Timer System**: Optional auto-phase progression
- Set when creating quiz or advancing phase
- Frontend polls `/api/timer-check?quizId=` every second
- Backend advances phase when timer expires

**Theme Images**:
- Uploaded via dashboard (multer handles storage in `uploads/`)
- Path stored in database (`theme_image` column)
- Displayed during Phase 1 on voter and presentation views

**Statistics & Charts** (Chart.js via CDN):
- Per-quiz: bar chart (total points), stacked bar (point distribution), details table
- Cross-quiz: participation trends line chart, all-time leaderboard, top submitters bar chart

**Badge System**: 13 achievement badges calculated from voting patterns (People's Champion, Polarizing, Dark Horse, etc.)

## Important Patterns & Conventions

**Versioning**: Version displayed in footer of all HTML files (currently v2.0.0)

**Error Handling**: Database queries return promises - use try/catch in routes

**Frontend Polling**: Voter and presentation views poll `/api/flow?quizId=` and `/api/timer-check?quizId=` to stay synchronized

**Quiz ID Passing**: All API calls from frontend include `quizId` - as query param for GET requests, in request body for POST requests

## File Upload Management

**Uploads Directory**:
- Theme images/GIFs stored in `uploads/` directory
- Directory is git-ignored but structure is tracked via `.gitkeep`
- Files have unique names: `theme-{timestamp}-{random}.{ext}`

## Security Considerations

- Passwords hashed with bcryptjs (cost factor 10)
- Server-side sessions in SQLite (not stored in cookies)
- No CSRF protection (uses `sameSite: 'strict'`)
- Content Security Policy disabled for inline scripts
- File uploads limited to 5MB and images only
- Helmet.js provides basic security headers

## Viewing the Application

- Voter interface: http://localhost:3001/?quiz=<uuid>
- Dashboard: http://localhost:3001/dashboard
- Presentation view: http://localhost:3001/presentation?quiz=<uuid>
- Statistics: http://localhost:3001/stats
