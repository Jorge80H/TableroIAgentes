// Webhook endpoint for n8n to send WhatsApp messages to InstantDB
import type { Express } from "express";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

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
      const { agentId, apiToken, clientPhone, clientName, message, senderType = "CLIENT" } = req.body;

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
          $: {
            where: {
              clientPhone: clientPhone,
              "agent.id": agentId
            }
          }
        }
      });

      let conversationId: string;

      if (conversationData?.conversations?.[0]) {
        // Existing conversation
        conversationId = conversationData.conversations[0].id;

        // Update lastMessageAt
        await db.transact([
          db.tx.conversations[conversationId].update({
            lastMessageAt: Date.now()
          })
        ]);
      } else {
        // Create new conversation
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
          })
        ]);
      }

      // Create message
      const messageId = crypto.randomUUID();

      await db.transact([
        db.tx.messages[messageId].update({
          senderType,
          content: message,
          senderName: senderType === "CLIENT" ? (clientName || clientPhone) : "AI Assistant"
        }),
        db.tx.messages[messageId].link({
          conversation: conversationId
        })
      ]);

      res.json({
        success: true,
        conversationId,
        messageId
      });

    } catch (error: any) {
      console.error("Webhook error:", error);
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
      console.error("Send message error:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: error.message
      });
    }
  });

  console.log("✅ n8n webhook endpoints registered:");
  console.log("   POST /api/webhooks/n8n/messages - Receive messages from n8n");
  console.log("   POST /api/n8n/send-message - Send messages via n8n");
}
