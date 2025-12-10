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

⚠️ **IMPORTANT**: In n8n's JSON mode, expressions must start with `=`

```json
{
  "agentId": "PASTE-YOUR-AGENT-ID-HERE",
  "apiToken": "c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  "clientPhone": "={{$json.messages[0].from}}",
  "clientName": "={{$json.contacts && $json.contacts[0] ? $json.contacts[0].profile.name : $json.messages[0].from}}",
  "message": "={{$json.messages[0].text.body}}",
  "senderType": "CLIENT"
}
```

**Critical Steps:**
1. Get your Agent ID from the dashboard (see Step 2 below)
2. Replace `PASTE-YOUR-AGENT-ID-HERE` with the actual Agent ID
3. Keep the API token exactly as shown: `c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4`
4. Note the `=` prefix in expressions like `={{$json...}}`

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

⚠️ **IMPORTANT**: In n8n's JSON mode, expressions must start with `=`

```json
{
  "agentId": "PASTE-YOUR-AGENT-ID-HERE",
  "apiToken": "c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  "clientPhone": "={{$node['WhatsApp Trigger'].json.messages[0].from}}",
  "clientName": "={{$node['WhatsApp Trigger'].json.contacts && $node['WhatsApp Trigger'].json.contacts[0] ? $node['WhatsApp Trigger'].json.contacts[0].profile.name : $node['WhatsApp Trigger'].json.messages[0].from}}",
  "message": "={{$json.output}}",
  "senderType": "AI"
}
```

**Critical Steps:**
1. Use the SAME Agent ID from Step 1
2. Keep the API token exactly as shown: `c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4`
3. Note the `=` prefix in expressions: `={{$node['WhatsApp Trigger']...}}`
4. The `message` field uses `={{$json.output}}` to get the AI's response

3. Connect: **AI Agent** → **Log AI Response** → **Send message**

### Step 3: Handle Human Takeover (Dashboard → WhatsApp)

When a human agent takes control in the dashboard and sends a message, it will be sent to your n8n webhook URL. You need to complete the webhook receptor workflow:

#### Webhook Configuration

Your webhook receptor should already exist in n8n. It will receive:

**URL**: `https://n8n.srv942208.hstgr.cloud/webhook/iagenteCeluvendo`

**Payload received from dashboard**:
```json
{
  "conversationId": "uuid",
  "clientPhone": "+573001234567",
  "message": "Response from human agent",
  "senderType": "HUMAN"
}
```

#### Complete the Webhook Workflow

After the Webhook node, add these nodes:

**1. Function Node: "Extract Message Data"**
```javascript
// Extract data from webhook payload
const conversationId = $input.item.json.conversationId;
const clientPhone = $input.item.json.clientPhone;
const message = $input.item.json.message;
const senderType = $input.item.json.senderType;

return {
  json: {
    conversationId,
    clientPhone,
    message,
    senderType,
    // Format for WhatsApp Business API
    to: clientPhone,
    text: {
      body: message
    }
  }
};
```

**2. HTTP Request Node: "Send to WhatsApp Business API"**

Configure according to your WhatsApp Business API provider:

**For WhatsApp Cloud API (Meta)**:
- Method: POST
- URL: `https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages`
- Authentication: Header Auth
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_ACCESS_TOKEN`
- Body (JSON):
```json
{
  "messaging_product": "whatsapp",
  "to": "={{$json.clientPhone}}",
  "type": "text",
  "text": {
    "body": "={{$json.message}}"
  }
}
```

**For Evolution API**:
- Method: POST
- URL: `https://your-evolution-api.com/message/sendText/YOUR_INSTANCE`
- Authentication: Header Auth
- Header Name: `apikey`
- Header Value: `YOUR_API_KEY`
- Body (JSON):
```json
{
  "number": "={{$json.clientPhone}}",
  "text": "={{$json.message}}"
}
```

**For Twilio**:
- Method: POST
- URL: `https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json`
- Authentication: Basic Auth
- User: `YOUR_ACCOUNT_SID`
- Password: `YOUR_AUTH_TOKEN`
- Body (Form-UrlEncoded):
  - `To`: `={{$json.clientPhone}}`
  - `From`: `whatsapp:+14155238886` (your Twilio WhatsApp number)
  - `Body`: `={{$json.message}}`

**3. Optional: "Log Success" Node**

Add a final HTTP Request to confirm the message was sent successfully back to the dashboard if needed.

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

### Step 2: Get Agent ID from Dashboard

**IMPORTANT: You MUST do this step to get the correct Agent ID**

1. Log in to the dashboard: https://tableroiagentes.netlify.app
2. Go to "Agents" section
3. Find your agent "ED Agente de Servicio WA"
4. **Copy the Agent ID** using the copy button next to "Agent ID"
   - It will look like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - This is a UUID generated by InstantDB when you created the agent

### Step 3: Update n8n with Agent ID

**Critical: You must update BOTH HTTP Request nodes**

1. Go to the **"Send to Dashboard"** node
2. In the JSON body, replace `PASTE-YOUR-AGENT-ID-HERE` with the Agent ID you copied
3. Go to the **"Log AI Response"** node
4. In the JSON body, replace `PASTE-YOUR-AGENT-ID-HERE` with the SAME Agent ID
5. Save the workflow

**Example after replacement:**
```json
{
  "agentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "apiToken": "c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  ...
}
```

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

### Error: "JSON parameter needs to be valid JSON" in n8n

**Cause**: n8n expressions in JSON mode are malformed

**Solution**:
1. ✅ **Use `=` prefix**: All expressions MUST start with `=`
   - ❌ Wrong: `"clientPhone": "{{$json.messages[0].from}}"`
   - ✅ Correct: `"clientPhone": "={{$json.messages[0].from}}"`

2. ✅ **Use the correct Agent ID**: Must be the UUID from the dashboard
   - ❌ Wrong: `"agentId": "{{$json.metadata.phoneNumberId}}"`
   - ❌ Wrong: `"agentId": "8B220DF0-eb3d-405f-819c-bd2010d5d01b"`
   - ✅ Correct: `"agentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"` (copied from dashboard)

3. ✅ **Use the correct API Token**: Must match exactly
   - ❌ Wrong: `"apiToken": "c4a6efec6ddc4ab3cb289b0cc62ff03f07f816e079c327ee7971fe1051f93b4"`
   - ✅ Correct: `"apiToken": "c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4"`

4. ✅ **Verify JSON syntax**: No trailing commas, proper quotes

**Complete correct example:**
```json
{
  "agentId": "PASTE-AGENT-ID-FROM-DASHBOARD",
  "apiToken": "c4b6ef6c60dc4e033cb0289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  "clientPhone": "={{$json.messages[0].from}}",
  "clientName": "={{$json.contacts && $json.contacts[0] ? $json.contacts[0].profile.name : $json.messages[0].from}}",
  "message": "={{$json.messages[0].text.body}}",
  "senderType": "CLIENT"
}
```

### Messages not appearing in dashboard
- Check n8n execution logs for HTTP Request errors
- Verify API token matches between n8n and dashboard
- Check Network tab in browser for webhook responses
- Verify Agent ID is correct (copy from dashboard)

### Dashboard can't send messages to WhatsApp
- Verify webhook URL is correct in agent configuration
- Check n8n webhook is active and accessible
- Verify agent exists and is active

### Authentication errors
- Verify `INSTANT_ADMIN_TOKEN` is set in environment
- Check API token matches in both systems (must be exact)
- Verify agent ID is correct (must be copied from dashboard)

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
