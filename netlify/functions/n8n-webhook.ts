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
    const { agentId, apiToken, clientPhone, clientName, message, senderType = "CLIENT" } = body;

    // Validate required fields
    if (!agentId || !apiToken || !clientPhone || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields",
          required: ["agentId", "apiToken", "clientPhone", "message"]
        }),
      };
    }

    // Verify agent exists and API token matches
    console.log("Looking for agent with ID:", agentId);
    console.log("Using APP_ID:", APP_ID);
    console.log("ADMIN_TOKEN exists:", !!ADMIN_TOKEN);

    const { data: agentData, error: queryError } = await db.query({
      agents: {}
    });

    console.log("Query error:", queryError);
    console.log("All agents in DB:", JSON.stringify(agentData));

    const agent = agentData?.agents?.find((a: any) => a.id === agentId);

    if (!agent) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Agent not found",
          debug: {
            searchingFor: agentId,
            foundAgents: agentData?.agents?.map((a: any) => a.id) || []
          }
        }),
      };
    }

    if (agent.apiToken !== apiToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid API token" }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        conversationId,
        messageId
      }),
    };

  } catch (error: any) {
    console.error("Webhook error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
    };
  }
};
