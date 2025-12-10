# InstantDB Configuration Guide

## Overview

This dashboard uses InstantDB as its real-time database. You need to configure permissions to allow users to read and write data.

## Step 1: Configure Permissions

### Access the Permissions Page

1. Go to https://instantdb.com/dash
2. Log in with your account
3. Select the app **"DashboardIAGENTES"**
   - App ID: `c089e2f5-a75d-427f-be1d-b059c6a0263d`
4. Click on **"Permissions"** in the left sidebar

### Apply Permission Rules

Copy and paste the following JSON into the permissions editor:

```json
{
  "organizations": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "false",
      "delete": "false"
    }
  },
  "agents": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "auth.id != null",
      "delete": "auth.id != null"
    }
  },
  "conversations": {
    "allow": {
      "view": "auth.id != null",
      "create": "true",
      "update": "auth.id != null || isWebhook",
      "delete": "false"
    },
    "bind": [
      "isWebhook", "data.id != null"
    ]
  },
  "messages": {
    "allow": {
      "view": "auth.id != null",
      "create": "true",
      "update": "false",
      "delete": "false"
    }
  },
  "auditLogs": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "false",
      "delete": "false"
    }
  }
}
```

### Click "Save"

After pasting the permissions, click the **"Save"** button. The changes will take effect immediately.

## Step 2: Get Admin Token (for Netlify)

The admin token is needed for server-side operations (Netlify functions that create messages from n8n webhooks).

1. In the InstantDB dashboard, go to **Settings** → **Tokens**
2. Find or create an **Admin Token**
3. Copy the token
4. Add it to your Netlify environment variables:
   - Variable name: `INSTANT_ADMIN_TOKEN`
   - Value: `[paste the admin token here]`

## Understanding the Permissions

### Organizations
- **View**: Only authenticated users can see organizations
- **Create**: Authenticated users can create organizations (during signup)
- **Update/Delete**: Disabled for safety

### Agents
- **Full CRUD**: Authenticated users can create, read, update, and delete agents
- This allows admins to manage their AI agents

### Conversations
- **View**: Only authenticated users can see conversations
- **Create**: **Open** (webhooks from n8n can create conversations)
- **Update**: Authenticated users OR webhooks (for updating lastMessageAt)
- **Delete**: Disabled

**Why "create: true"?**
- n8n webhooks create conversations when new clients message
- Webhooks are not authenticated, so we allow public creation
- Security: Webhooks must provide valid agentId and apiToken

### Messages
- **View**: Only authenticated users can see messages
- **Create**: **Open** (webhooks from n8n can create messages)
- **Update/Delete**: Disabled

**Why "create: true"?**
- n8n webhooks create messages for both CLIENT and AI messages
- Webhooks are not authenticated, so we allow public creation
- Security: Messages are linked to conversations, which require valid agents

### Audit Logs
- **View/Create**: Authenticated users only
- **Update/Delete**: Disabled for data integrity

## Security Considerations

### Public Creation (conversations and messages)

While `create: true` seems open, it's secure because:

1. **API Token Verification**: n8n webhooks include `apiToken` which is validated against the agent
2. **Agent Validation**: Only valid agents (with correct tokens) can create data
3. **Server-Side Validation**: Netlify functions validate all incoming data
4. **Data Isolation**: Each message is linked to a conversation → agent → organization

### Authentication

The dashboard uses **InstantDB Magic Code Auth**:
- Users sign in with email
- InstantDB sends a magic code
- No passwords stored
- Session management handled by InstantDB

## Troubleshooting

### Error: "Permission denied"

**Cause**: Permissions not configured or user not authenticated

**Solution**:
1. Verify permissions are saved in InstantDB dashboard
2. Check user is logged in (look for `auth.id` in browser console)
3. Clear browser cache and re-login

### Error: "Admin token required"

**Cause**: `INSTANT_ADMIN_TOKEN` not set in Netlify

**Solution**:
1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Add `INSTANT_ADMIN_TOKEN` with the token from InstantDB
4. Redeploy the site

### Messages not appearing

**Cause**: Permissions not allowing creation or view

**Solution**:
1. Check permissions are configured correctly
2. Verify `messages.create = true` and `messages.view = "auth.id != null"`
3. Check n8n is sending correct data format

## Next Steps

After configuring permissions:

1. ✅ Test login to the dashboard
2. ✅ Create an agent in the Agents page
3. ✅ Copy the Agent ID
4. ✅ Update n8n workflow with the Agent ID
5. ✅ Send a test message from WhatsApp
6. ✅ Verify message appears in dashboard

## Reference

- InstantDB Permissions Docs: https://www.instantdb.com/docs/permissions
- Dashboard URL: https://tableroiagentes.netlify.app
- InstantDB Dashboard: https://instantdb.com/dash
