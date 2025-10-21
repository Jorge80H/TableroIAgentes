# n8n Integration Guide

## Overview

This dashboard integrates with your n8n workflow "ED Agente de Servicio WA" to track WhatsApp conversations and allow human agents to take control when needed.

## Architecture

```
WhatsApp → n8n → Dashboard (InstantDB)
                ↓
           AI Response
                ↓
           WhatsApp
```

When a human takes control:
```
Dashboard → n8n Webhook → WhatsApp
```

## Required Modifications to n8n Workflow

### Step 1: Add HTTP Request Node to Send Messages to Dashboard

1. Open workflow "ED Agente de Servicio WA" in n8n
2. Add a new **HTTP Request** node after the "WhatsApp Trigger"
3. Configure the node:

**Node Settings:**
- **Name**: `Send to Dashboard`
- **Method**: `POST`
- **URL**: `https://tableroiagentes.netlify.app/api/webhooks/n8n/messages`
- **Authentication**: None
- **Send Body**: Yes
- **Body Content Type**: JSON

**Body Parameters (use JSON):**
```json
{
  "agentId": "{{ $json.metadata.phoneNumberId }}",
  "apiToken": "YOUR_DASHBOARD_API_TOKEN",
  "clientPhone": "{{ $json.messages[0].from }}",
  "clientName": "{{ $json.contacts && $json.contacts[0] ? $json.contacts[0].profile.name : $json.messages[0].from }}",
  "message": "{{ $json.messages[0].text.body }}",
  "senderType": "CLIENT"
}
```

**Important**: Replace `YOUR_DASHBOARD_API_TOKEN` with a secure token you generate.

4. Connect nodes:
   - **WhatsApp Trigger** → **Send to Dashboard** (parallel to AI Agent)
   - Keep existing: **WhatsApp Trigger** → **AI Agent**

### Step 2: Add HTTP Request to Send AI Responses to Dashboard

1. Add another **HTTP Request** node after "AI Agent"
2. Configure the node:

**Node Settings:**
- **Name**: `Log AI Response`
- **Method**: `POST`
- **URL**: `https://tableroiagentes.netlify.app/api/webhooks/n8n/messages`
- **Authentication**: None
- **Send Body**: Yes
- **Body Content Type**: JSON

**Body Parameters:**
```json
{
  "agentId": "{{ $node['WhatsApp Trigger'].json.metadata.phoneNumberId }}",
  "apiToken": "YOUR_DASHBOARD_API_TOKEN",
  "clientPhone": "{{ $node['WhatsApp Trigger'].json.messages[0].from }}",
  "clientName": "{{ $node['WhatsApp Trigger'].json.contacts && $node['WhatsApp Trigger'].json.contacts[0] ? $node['WhatsApp Trigger'].json.contacts[0].profile.name : $node['WhatsApp Trigger'].json.messages[0].from }}",
  "message": "{{ $json.output }}",
  "senderType": "AI"
}
```

3. Connect: **AI Agent** → **Log AI Response** → **Send message**

### Step 3: Handle Human Takeover

When a human agent takes control in the dashboard, messages will be sent to your n8n webhook URL. Update your workflow to handle this:

1. Note your workflow's webhook URL (it should be something like):
   ```
   https://your-n8n-instance.com/webhook/b6bbaec2-3d36-4978-bf3a-973f17186ae7
   ```

2. This URL will be used when creating an agent in the dashboard

## Dashboard Configuration

### Step 1: Set Environment Variables

Add to your `.env` file (and Netlify environment variables):

```env
VITE_INSTANT_APP_ID=c089e2f5-a75d-427f-be1d-b059c6a0263d
INSTANT_ADMIN_TOKEN=<get-from-instantdb-dashboard>
PORT=5000
NODE_ENV=production
```

**Get InstantDB Admin Token:**
1. Go to https://instantdb.com/dash
2. Select app "DashboardIAGENTES"
3. Go to Settings → Admin Tokens
4. Create a new admin token
5. Copy the token to `INSTANT_ADMIN_TOKEN`

### Step 2: Create Agent in Dashboard

1. Log in to the dashboard: https://tableroiagentes.netlify.app
2. Go to "Agents" section
3. Click "Create Agent"
4. Fill in:
   - **Name**: `ED Agente de Servicio WA`
   - **Webhook URL**: `https://your-n8n-instance.com/webhook/b6bbaec2-3d36-4978-bf3a-973f17186ae7`
   - **API Token**: Same token you used in n8n (`YOUR_DASHBOARD_API_TOKEN`)
5. Copy the Agent ID (UUID) generated

### Step 3: Update n8n with Agent ID

Go back to n8n and update both HTTP Request nodes:
- Replace `{{ $json.metadata.phoneNumberId }}` with your actual Agent ID if needed
- Or configure the WhatsApp Trigger to include metadata that contains the agent ID

## API Endpoints

### Incoming Messages (n8n → Dashboard)

**Endpoint**: `POST /api/webhooks/n8n/messages`

**Payload**:
```json
{
  "agentId": "uuid-of-agent",
  "apiToken": "secret-token",
  "clientPhone": "+573001234567",
  "clientName": "John Doe",
  "message": "Hello!",
  "senderType": "CLIENT" | "AI"
}
```

**Response**:
```json
{
  "success": true,
  "conversationId": "uuid",
  "messageId": "uuid"
}
```

### Outgoing Messages (Dashboard → n8n)

**Endpoint**: `POST /api/n8n/send-message`

**Payload**:
```json
{
  "conversationId": "uuid",
  "agentId": "uuid",
  "message": "Human agent response"
}
```

This endpoint is called automatically when a human agent sends a message in the dashboard.

## Testing the Integration

1. **Test incoming message**:
   - Send a WhatsApp message to your configured number
   - Check n8n execution logs
   - Verify message appears in dashboard under "Conversations"

2. **Test AI response**:
   - Verify AI response is logged in dashboard
   - Check conversation shows correct sender (AI vs CLIENT)

3. **Test human takeover**:
   - In dashboard, click "Take Control" on a conversation
   - Send a message from the dashboard
   - Verify message goes through n8n to WhatsApp
   - Verify message appears in conversation history

## Security Considerations

1. **API Token**: Generate a strong random token for authentication
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **HTTPS Only**: Both dashboard and n8n should use HTTPS

3. **Environment Variables**: Never commit tokens to git

4. **Rate Limiting**: Consider adding rate limiting to webhook endpoints

## Troubleshooting

### Messages not appearing in dashboard
- Check n8n execution logs for HTTP Request errors
- Verify API token matches between n8n and dashboard
- Check Network tab in browser for webhook responses

### Dashboard can't send messages to WhatsApp
- Verify webhook URL is correct in agent configuration
- Check n8n webhook is active and accessible
- Verify agent exists and is active

### Authentication errors
- Verify `INSTANT_ADMIN_TOKEN` is set in environment
- Check API token matches in both systems
- Verify agent ID is correct

## Workflow Diagram

```
┌─────────────────┐
│ WhatsApp Client │
└────────┬────────┘
         │ Message
         ↓
┌─────────────────┐
│ WhatsApp Trigger│
└────┬───────┬────┘
     │       │
     │       └─────────────────┐
     │                         │
     ↓                         ↓
┌────────────────┐    ┌───────────────┐
│Send to Dashboard│    │   AI Agent    │
└────────────────┘    └───────┬───────┘
                              │
                              ↓
                      ┌───────────────┐
                      │Log AI Response│
                      └───────┬───────┘
                              │
                              ↓
                      ┌───────────────┐
                      │ Send message  │
                      └───────┬───────┘
                              │
                              ↓
                      ┌───────────────┐
                      │WhatsApp Client│
                      └───────────────┘
```

## Next Steps

After integration is complete:
1. Monitor conversations in real-time
2. Train human agents on takeover process
3. Review audit logs for compliance
4. Optimize AI responses based on takeover frequency
