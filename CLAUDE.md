# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WhatsApp Conversation Dashboard - Multi-tenant platform for managing AI and human-operated WhatsApp conversations. Organizations can create AI agents, integrate them with n8n workflows, and have human agents take control of conversations when needed.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Wouter (routing) + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript (optional for webhooks)
- **Database**: InstantDB (real-time graph database)
- **Real-time**: InstantDB WebSocket (built-in)
- **Auth**: InstantDB Auth
- **Deployment**: Netlify
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

# Deploy to Netlify
netlify deploy --prod
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_INSTANT_APP_ID=c089e2f5-a75d-427f-be1d-b059c6a0263d
PORT=5000
NODE_ENV=development
```

## Project Structure

```
client/              # React frontend
  src/
    components/      # UI components and feature components
    pages/          # Page components (dashboard, agents, conversations, etc.)
    hooks/          # Custom React hooks (WebSocket, toast)
    lib/            # Utilities (React Query, InstantDB client)
      instant.ts    # InstantDB initialization and types
server/             # Express backend (optional for webhook proxy)
  index.ts          # Server entry point
  routes.ts         # API routes for webhooks
```

## Architecture

### Multi-Tenant Model

- Organizations → $users (InstantDB built-in users)
- Organizations → Agents (AI bots with webhook URLs)
- Agents → Conversations → Messages
- All queries filtered by organization links for data isolation

### Conversation Control Flow

1. **AI_ACTIVE**: Bot handles messages via n8n webhook
2. **HUMAN_ACTIVE**: Agent takes control, messages go through dashboard
3. **ARCHIVED**: Conversation closed

### Real-Time Communication

- **InstantDB subscriptions**: Automatic real-time updates
- Multi-tenant isolation via organization links
- No manual WebSocket management needed

## Database Schema (InstantDB)

**App Configuration:**
- App ID: `c089e2f5-a75d-427f-be1d-b059c6a0263d`
- App Name: DashboardIAGENTES

**Main entities:**
- `organizations` - Multi-tenant organizations
- `$users` - InstantDB built-in users (linked to organizations)
- `agents` - AI agents with webhook URLs and API tokens
- `conversations` - WhatsApp conversations with status
- `messages` - Individual messages (CLIENT/AI/HUMAN)
- `auditLogs` - Action tracking for compliance

**Links (relationships):**
- organizations → users (one-to-many)
- organizations → agents (one-to-many)
- agents → conversations (one-to-many)
- conversations → messages (one-to-many)
- conversations → activeUser (many-to-one with $users)
- auditLogs → user, conversation, agent

Schema defined in InstantDB dashboard and typed in [client/src/lib/instant.ts](client/src/lib/instant.ts).

## InstantDB Usage

### Querying Data

```typescript
import { db } from '@/lib/instant';

// Query with relationships
const { data, isLoading, error } = db.useQuery({
  organizations: {
    agents: {},
    users: {}
  }
});

// Query specific organization's agents
const { data } = db.useQuery({
  agents: {
    $: {
      where: {
        'organization.id': organizationId
      }
    }
  }
});
```

### Mutations

```typescript
// Add data
db.transact([
  db.tx.agents[agentId].update({
    name: 'New Name',
    isActive: true
  })
]);

// Link data
db.transact([
  db.tx.agents[agentId].link({
    organization: organizationId
  })
]);
```

### Authentication

```typescript
// Sign in with email
db.auth.signInWithEmail({ email: 'user@example.com' });

// Get current user
const { user, isLoading } = db.useAuth();
```

## n8n Integration

### n8n MCP Server

Este proyecto incluye el MCP de n8n ([n8n-mcp](https://github.com/czlonkowski/n8n-mcp)) configurado en [.mcp.json](.mcp.json). Proporciona acceso a:

- **Documentación de nodos**: Información sobre los 1,084+ nodos de n8n
- **Propiedades y operaciones**: Detalles de configuración de cada nodo
- **API de n8n** (opcional): Conexión directa a tu instancia de n8n

**Configuración con API de n8n (opcional):**

Para conectar con tu instancia de n8n, añade las siguientes variables de entorno al archivo `.mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://tu-instancia-n8n.com",
        "N8N_API_KEY": "tu-api-key"
      }
    }
  }
}
```

### Webhook Integration

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

### Webhook Endpoint

The Express backend provides:
- `POST /api/webhooks/messages` - n8n webhook for incoming WhatsApp messages
  - Validates agent API token
  - Creates conversation if new client (via InstantDB)
  - Data syncs automatically to all clients via InstantDB

## Design System

Follows Material Design + Slack/Linear patterns as detailed in [design_guidelines.md](design_guidelines.md):
- Dark mode support with theme toggle
- Status-based color coding (green=AI, blue=Human)
- Three-column layout: Sidebar | Conversation List | Chat View
- Responsive breakpoints for mobile/tablet

## Deployment

**Netlify Configuration:**
- Build command: `npm run build`
- Publish directory: `dist/client`
- Environment variables:
  - `VITE_INSTANT_APP_ID`: `c089e2f5-a75d-427f-be1d-b059c6a0263d`

The app is configured for Netlify deployment with [netlify.toml](netlify.toml).

## Common Patterns

### Adding a new entity to InstantDB

1. Use the InstantDB MCP tools to update schema:
```bash
mcp__instant__push-schema
```

2. Update TypeScript types in [client/src/lib/instant.ts](client/src/lib/instant.ts)

3. Use queries and mutations in components:
```typescript
const { data } = db.useQuery({ newEntity: {} });
```

### Multi-tenant data isolation

Always filter queries by organization:

```typescript
const { data } = db.useQuery({
  agents: {
    $: {
      where: {
        'organization.id': user.organizationId
      }
    }
  }
});
```

### Frontend state management

- **Server state**: InstantDB subscriptions (real-time)
- **Local state**: React hooks
- **No Redux/Zustand needed**: InstantDB handles sync

### Real-time updates

InstantDB handles real-time automatically:

```typescript
// This automatically updates when data changes
const { data } = db.useQuery({ conversations: {} });
```

No manual WebSocket management needed.
