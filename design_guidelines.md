# Design Guidelines: WhatsApp Conversation Dashboard

## Design Approach

**System:** Material Design with Slack/Linear-inspired patterns for messaging interfaces
**Rationale:** Enterprise dashboard requiring clear data hierarchy, real-time updates, and efficient agent workflow. Prioritizes functionality and information density over visual experimentation.

## Core Design Principles

1. **Clarity Over Decoration** - Every element serves a functional purpose
2. **Status Visibility** - Always clear who's in control (AI vs Human), conversation state, and agent availability
3. **Efficient Workflows** - Minimize clicks to take control, send messages, or switch conversations
4. **Scalable Information** - Design accommodates high conversation volumes

## Color Palette

**Dark Mode Primary:**
- Background: 222 14% 12% (deep charcoal)
- Surface: 222 14% 16% (card background)
- Surface Elevated: 222 14% 20% (modals, dropdowns)

**Light Mode Primary:**
- Background: 0 0% 98% (off-white)
- Surface: 0 0% 100% (white)
- Border: 220 13% 91%

**Semantic Colors:**
- AI Active: 142 76% 36% (green - bot in control)
- Human Active: 221 83% 53% (blue - agent in control)
- Client Messages: 0 0% 50% (neutral gray)
- Warning/Pending: 38 92% 50% (amber)
- Error: 0 84% 60% (red)
- Success: 142 71% 45% (green confirmation)

**Status Indicators:**
- Online: 142 76% 36%
- Away: 38 92% 50%
- Offline: 0 0% 63%

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts)
- Monospace: JetBrains Mono (for IDs, timestamps)

**Hierarchy:**
- Page Headers: text-2xl font-semibold (agent management, conversation views)
- Section Headers: text-lg font-medium
- Conversation List Items: text-sm font-medium
- Message Content: text-sm font-normal
- Metadata/Timestamps: text-xs text-muted-foreground
- Buttons/Actions: text-sm font-medium

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section gaps: gap-4, gap-6
- List item spacing: space-y-2
- Card spacing: p-6
- Message bubbles: p-3

**Grid Structure:**
- Main Layout: Three-column (Sidebar 240px | Conversation List 320px | Chat View flex-1)
- Responsive: Stack to single column on mobile, two-column on tablet
- Container: max-w-screen-2xl for ultra-wide screens

## Component Library

### Navigation & Layout

**Top Bar (64px height):**
- Logo/Branding left
- Organization switcher center (for multi-tenant)
- User profile dropdown + notifications right
- Border bottom with subtle shadow

**Sidebar (240px fixed):**
- Dashboard overview
- Agents management
- Conversations (active)
- Analytics
- Settings
- Audit logs
- Hover states with bg-accent

### Conversation Interface

**Conversation List (320px):**
- Search/filter bar at top
- Status tabs: All | AI Active | Human Active | Archived
- List items with:
  - Client name/phone (font-medium)
  - Last message preview (text-muted, truncated)
  - Timestamp (text-xs, right-aligned)
  - Unread badge (if applicable)
  - Status indicator dot (AI=green, Human=blue)
- Selected conversation: bg-accent with left border (3px)

**Chat View:**
- Header bar:
  - Client info left (name, phone, status)
  - Control buttons right: "Take Control" | "Return to AI" | More actions
  - Current handler badge: "AI Agent" or "[Agent Name]"
- Message area:
  - Client messages: left-aligned, bg-muted, rounded-lg
  - AI messages: right-aligned, bg-green-600/10, border-l-2 border-green-600
  - Human messages: right-aligned, bg-blue-600/10, border-l-2 border-blue-600
  - Timestamps below each message group (text-xs)
  - Avatar/initials for AI vs Human identification
- Input area:
  - Text input with rounded-lg border
  - Send button (primary color when active)
  - Disabled state when AI in control with tooltip explanation

### Agent Management

**Agent Cards:**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Card structure:
  - Agent name (text-lg font-semibold)
  - Status indicator + "Active" | "Inactive"
  - Webhook URL (truncated, monospace)
  - Connected conversations count
  - Actions: Edit | Delete | View Stats

**Create Agent Form:**
- Modal dialog (max-w-2xl)
- Fields: Name, Webhook URL, API Token (password field)
- Organization assignment (super admin only)
- Clear validation states

### Data Display

**Tables (Audit Logs):**
- Striped rows (bg-muted/50 on alternate)
- Sticky header
- Columns: Timestamp | User | Action | Conversation | Details
- Hover states on rows
- Sort indicators on headers

**Status Badges:**
- Rounded-full with px-2.5 py-0.5
- AI Active: bg-green-100 text-green-800 (dark: bg-green-900/30 text-green-300)
- Human Active: bg-blue-100 text-blue-800
- Archived: bg-gray-100 text-gray-800

## Real-Time Indicators

**New Message Notifications:**
- Toast notifications (top-right)
- Slide-in animation
- Auto-dismiss after 5s
- Sound alert (toggleable)
- Unread count badges on conversation list

**Typing Indicators:**
- Three animated dots in message area
- "[Client Name] is typing..."
- Subtle pulse animation

## Accessibility & Dark Mode

- Maintain WCAG AA contrast ratios
- Full keyboard navigation support
- Focus indicators: ring-2 ring-primary ring-offset-2
- Dark mode toggle in user menu
- Consistent dark mode across all components including inputs
- Screen reader labels for all status indicators

## Images

**Hero Section:** Not applicable - this is a dashboard application
**Avatar Placeholders:** Use initials in colored circles for users/agents
**Empty States:** Simple illustrations for "No conversations" or "No agents configured"
**Logo:** Top-left corner, max height 32px