// Webhook endpoint for n8n to send WhatsApp messages to InstantDB
import type { Express } from "express";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const IS_DEV = process.env.NODE_ENV === 'development';

function debugLog(...args: any[]) {
  if (IS_DEV) console.log(...args);
}

/**
 * Normalize phone numbers to ensure consistent comparison
 * - Remove leading '=' (from n8n expressions)
 * - Remove spaces, hyphens, parentheses
 * - Trim whitespace
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  return phone
    .trim()
    .replace(/^=+/, '') // Remove leading '=' characters
    .replace(/[\s\-\(\)]/g, ''); // Remove spaces, hyphens, parentheses
}

// Lazy load InstantDB admin only when needed
let db: any = null;

async function getDB() {
  if (!db) {
    if (!ADMIN_TOKEN) {
      throw new Error("INSTANT_ADMIN_TOKEN not set");
    }
    const { init } = await import("@instantdb/admin");
    db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
  }
  return db;
}

export function registerWebhooks(app: Express) {
  /**
   * Webhook endpoint for n8n to send incoming WhatsApp messages
   *
   * Expected payload from n8n:
   * {
   *   "agentId": "agent-uuid",
   *   "apiToken": "secret-token",
   *   "clientPhone": "+573001234567",
   *   "clientName": "John Doe",
   *   "message": "Hello!",
   *   "senderType": "CLIENT" | "AI"
   * }
   */
  app.post("/api/webhooks/n8n/messages", async (req, res) => {
    try {
      let { agentId, apiToken, clientPhone, clientName, message, senderType = "CLIENT" } = req.body;

      // Normalize phone number
      clientPhone = normalizePhoneNumber(clientPhone);

      debugLog("📨 Incoming message:", { senderType, clientPhone, clientName });

      // Validate required fields
      if (!agentId || !apiToken || !clientPhone || !message) {
        res.status(400).json({
          error: "Missing required fields",
          required: ["agentId", "apiToken", "clientPhone", "message"]
        });
        return;
      }

      const db = await getDB();

      // Verify agent exists and API token matches
      const { data: agentData } = await db.query({
        agents: {
          $: {
            where: {
              id: agentId
            }
          }
        }
      });

      const agent = agentData?.agents?.[0];

      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      if (agent.apiToken !== apiToken) {
        res.status(401).json({ error: "Invalid API token" });
        return;
      }

      // Find existing conversation or create new one
      const { data: conversationData } = await db.query({
        conversations: {
          agent: {}
        }
      });

      // Find existing conversation with normalized phone number
      // First try to find one with matching phone AND agent
      let existingConversation = conversationData?.conversations?.find((c: any) => {
        const phoneMatch = normalizePhoneNumber(c.clientPhone) === clientPhone;
        const agentMatch = c.agent && c.agent.length > 0 && c.agent[0].id === agentId;
        return phoneMatch && agentMatch;
      });

      let conversationId: string;
      const messageId = crypto.randomUUID();

      if (existingConversation) {
        conversationId = existingConversation.id;
        const hasAgentLink = existingConversation.agent && existingConversation.agent.length > 0;

        const transactions = [
          db.tx.conversations[conversationId].update({
            lastMessageAt: Date.now()
          }),
          db.tx.messages[messageId].update({
            senderType,
            content: message,
            senderName: senderType === "CLIENT" ? (clientName || clientPhone) : "AI Assistant",
            createdAt: Date.now()
          }),
          db.tx.messages[messageId].link({
            conversation: conversationId
          })
        ];

        // Fix missing agent link on old conversations
        if (!hasAgentLink) {
          transactions.push(
            db.tx.conversations[conversationId].link({
              agent: agentId
            })
          );
        }

        await db.transact(transactions);
      } else {
        // Create new conversation and message
        conversationId = crypto.randomUUID();

        await db.transact([
          db.tx.conversations[conversationId].update({
            clientPhone,
            clientName: clientName || clientPhone,
            status: "AI_ACTIVE",
            lastMessageAt: Date.now()
          }),
          db.tx.conversations[conversationId].link({
            agent: agentId
          }),
          db.tx.messages[messageId].update({
            senderType,
            content: message,
            senderName: senderType === "CLIENT" ? (clientName || clientPhone) : "AI Assistant",
            createdAt: Date.now()
          }),
          db.tx.messages[messageId].link({
            conversation: conversationId
          })
        ]);
      }

      debugLog("✅ Message saved:", { conversationId: conversationId.substring(0, 8), messageId: messageId.substring(0, 8) });

      res.json({
        success: true,
        conversationId,
        messageId,
        senderType
      });

    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });

  /**
   * Endpoint for dashboard to send messages through n8n
   * This sends a message from the dashboard to the WhatsApp user via n8n
   */
  app.post("/api/n8n/send-message", async (req, res) => {
    try {
      const { conversationId, agentId, message } = req.body;

      if (!conversationId || !agentId || !message) {
        res.status(400).json({
          error: "Missing required fields",
          required: ["conversationId", "agentId", "message"]
        });
        return;
      }

      const db = await getDB();

      // Get agent with webhook URL
      const { data: agentData } = await db.query({
        agents: {
          $: {
            where: {
              id: agentId
            }
          }
        }
      });

      const agent = agentData?.agents?.[0];

      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      // Get conversation details
      const { data: conversationData } = await db.query({
        conversations: {
          $: {
            where: {
              id: conversationId
            }
          }
        }
      });

      const conversation = conversationData?.conversations?.[0];

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Send to n8n webhook
      const webhookResponse = await fetch(agent.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agent.apiToken}`
        },
        body: JSON.stringify({
          conversationId,
          clientPhone: conversation.clientPhone,
          message,
          senderType: "HUMAN"
        })
      });

      if (!webhookResponse.ok) {
        throw new Error(`n8n webhook failed: ${webhookResponse.statusText}`);
      }

      res.json({
        success: true,
        webhookStatus: webhookResponse.status
      });

    } catch (error: any) {
      console.error("Send message error:", error.message);
      res.status(500).json({
        error: "Failed to send message",
        message: error.message
      });
    }
  });

  debugLog("✅ n8n webhook endpoints registered");
}
