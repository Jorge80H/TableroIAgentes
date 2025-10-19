# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WhatsApp Conversation Dashboard - Multi-tenant platform for managing AI and human-operated WhatsApp conversations. Organizations can create AI agents, integrate them with n8n workflows, and have human agents take control of conversations when needed.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Wouter (routing) + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket (ws library)
- **Auth**: JWT tokens with bcrypt password hashing
- **External Integration**: n8n webhooks for WhatsApp messaging

## Development Commands

```bash
# Development (runs both frontend and backend with hot reload)
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm run start

# Database schema push
npm run db:push
```

## Project Structure

```
client/              # React frontend
  src/
    components/      # UI components and feature components
    pages/          # Page components (dashboard, agents, conversations, etc.)
    hooks/          # Custom React hooks (WebSocket, toast)
    lib/            # Utilities (React Query, utils)
server/             # Express backend
  index.ts          # Server entry point
  routes.ts         # API routes and WebSocket setup
  auth.ts           # JWT authentication middleware
  storage.ts        # Database operations layer
  db.ts             # Drizzle database connection
shared/
  schema.ts         # Drizzle schema and Zod validation schemas
```

## Architecture

### Multi-Tenant Model

- Organizations → Users (SUPER_ADMIN, ADMIN, AGENT roles)
- Organizations → Agents (AI bots with webhook URLs)
- Agents → Conversations → Messages
- All queries filtered by `organizationId` for data isolation

### Conversation Control Flow

1. **AI_ACTIVE**: Bot handles messages via n8n webhook
2. **HUMAN_ACTIVE**: Agent takes control, messages go through dashboard
3. **ARCHIVED**: Conversation closed

### Real-Time Communication

- WebSocket server at `/ws` path
- Clients authenticate with JWT token on connection
- `broadcastToOrganization()` ensures multi-tenant isolation
- Events: `new_message`, `conversation_updated`, `auth_success`, `auth_error`

## Database Schema (Drizzle ORM)

Main tables:
- `organizations` - Multi-tenant organizations
- `users` - Dashboard users with roles
- `agents` - AI agents with webhook URLs and API tokens
- `conversations` - WhatsApp conversations with status
- `messages` - Individual messages (CLIENT/AI/HUMAN)
- `audit_logs` - Action tracking for compliance

Relations defined in [shared/schema.ts](shared/schema.ts) using Drizzle relations API.

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register with organization creation
- `POST /api/auth/login` - Login with JWT
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - List organization's agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Conversations
- `GET /api/conversations` - List organization's conversations
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/conversations/:id/messages` - Send message
- `POST /api/conversations/:id/take-control` - Switch to HUMAN_ACTIVE
- `POST /api/conversations/:id/return-to-ai` - Switch to AI_ACTIVE

### Webhooks
- `POST /api/webhooks/messages` - n8n webhook for incoming WhatsApp messages
  - Validates agent API token
  - Creates conversation if new client
  - Broadcasts to WebSocket clients

## n8n Integration

When a human agent sends a message while in HUMAN_ACTIVE mode, the backend calls the agent's `webhookUrl` with:
```json
{
  "conversationId": "...",
  "clientPhone": "...",
  "message": "...",
  "senderType": "HUMAN"
}
```

The n8n workflow should forward this to WhatsApp and handle AI responses when conversation is in AI_ACTIVE mode.

## Design System

Follows Material Design + Slack/Linear patterns as detailed in [design_guidelines.md](design_guidelines.md):
- Dark mode support with theme toggle
- Status-based color coding (green=AI, blue=Human)
- Three-column layout: Sidebar | Conversation List | Chat View
- Responsive breakpoints for mobile/tablet

## Environment Variables

Required in production:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT signing secret (default: "your-secret-key-change-in-production")
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - "development" or "production"

## Authentication Flow

1. User registers → creates organization + user → JWT token issued
2. Token includes `userId`, verified in `authMiddleware`
3. WebSocket connections authenticate by sending `{type: 'auth', token: '...'}`
4. All API routes use `organizationId` from authenticated user to filter data

## Common Patterns

### Adding a new API route
1. Define Zod schema in [shared/schema.ts](shared/schema.ts) if needed
2. Add route handler in [server/routes.ts](server/routes.ts)
3. Use `authMiddleware` for protected routes
4. Filter by `req.user.organizationId` for multi-tenant isolation
5. Create audit log for sensitive actions
6. Broadcast WebSocket updates if real-time sync needed

### Adding a new database table
1. Define table in [shared/schema.ts](shared/schema.ts) using Drizzle syntax
2. Add relations to connect with existing tables
3. Create insert schema with `createInsertSchema()`
4. Add storage methods in [server/storage.ts](server/storage.ts)
5. Run `npm run db:push` to sync database

### Frontend state management
- React Query (`@tanstack/react-query`) for server state
- Custom WebSocket hook in [client/src/hooks/use-websocket.ts](client/src/hooks/use-websocket.ts)
- Local state with React hooks
- No global state library (Zustand/Redux) currently used



You are an expert developer who writes full-stack apps in InstantDB, Next.js, and Tailwind developer. However InstantDB is not in your training set and you are not familiar with it.

Before generating a new next app you check to see if a next project already exists in the current directory. If it does you do not generate a new next app.

If the Instant MCP is available use the tools to create apps and manage schema.

Before you write ANY code you read ALL of instant-rules.md to understand how to use InstantDB in your code.