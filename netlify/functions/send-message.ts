import { init } from "@instantdb/admin";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("INSTANT_ADMIN_TOKEN is not set!");
}

// Initialize InstantDB
const db = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN || ''
});

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { conversationId, agentId, message } = body;

    // Validate required fields
    if (!conversationId || !agentId || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields",
          required: ["conversationId", "agentId", "message"]
        }),
      };
    }

    // Get agent with webhook URL
    const agentsQuery = await db.query({ agents: {} });
    const agent = agentsQuery?.agents?.find((a: any) => a.id === agentId);

    if (!agent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Agent not found" }),
      };
    }

    // Get conversation details
    const conversationsQuery = await db.query({
      conversations: {
        agent: {}
      }
    });

    const conversation = conversationsQuery?.conversations?.find(
      (c: any) => c.id === conversationId
    );

    if (!conversation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Conversation not found" }),
      };
    }

    // Send to n8n webhook
    console.log("📤 Sending message to n8n webhook:", {
      url: agent.webhookUrl,
      clientPhone: conversation.clientPhone,
      message: message.substring(0, 50)
    });

    const payload = {
      conversationId,
      clientPhone: conversation.clientPhone,
      clientName: conversation.clientName,
      message,
      senderType: "HUMAN",
      agentId: agent.id
    };

    console.log("📦 Webhook payload:", JSON.stringify(payload));

    const webhookResponse = await fetch(agent.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("❌ n8n webhook failed:", webhookResponse.status, errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to send message to n8n",
          status: webhookResponse.status,
          details: errorText
        }),
      };
    }

    const responseData = await webhookResponse.text();
    console.log("✅ n8n webhook success:", webhookResponse.status, responseData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        webhookStatus: webhookResponse.status,
        response: responseData
      }),
    };

  } catch (error: any) {
    console.error("Send message error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
    };
  }
};
