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
    let { agentId, apiToken, clientPhone, clientName, message, senderType = "CLIENT" } = body;

    // Normalize clientPhone - remove leading '=' if present (from n8n expressions)
    if (clientPhone && clientPhone.startsWith('=')) {
      clientPhone = clientPhone.substring(1);
    }
    if (clientName && clientName.startsWith('=')) {
      clientName = clientName.substring(1);
    }

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

    let agent;
    try {
      // InstantDB admin SDK uses transact for reads too
      // Let's try to get the specific agent by ID directly
      console.log("Attempting to query agent...");

      // Try using tx to read data
      const agentsQuery = await db.query({ agents: {} });
      console.log("Query result type:", typeof agentsQuery);
      console.log("Query result:", JSON.stringify(agentsQuery));

      // The result might be directly the data object
      const agents = agentsQuery?.agents || [];
      console.log("Agents found:", agents.length);
      console.log("All agents:", JSON.stringify(agents));

      agent = agents.find((a: any) => a.id === agentId);
    } catch (error: any) {
      console.error("Query error:", error);
      console.error("Error stack:", error.stack);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Database query failed",
          message: error.message,
          stack: error.stack
        }),
      };
    }

    if (!agent) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Agent not found",
          debug: {
            searchingFor: agentId,
            foundAgents: agentsQuery?.agents?.map((a: any) => a.id) || []
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
    console.log("Looking for existing conversation for phone:", clientPhone, "agent:", agentId);

    const allConversations = await db.query({
      conversations: {
        agent: {}
      }
    });

    console.log("All conversations count:", allConversations?.conversations?.length || 0);

    // Log each conversation for debugging
    allConversations?.conversations?.forEach((c: any, index: number) => {
      console.log(`Conversation ${index}:`, {
        id: c.id,
        clientPhone: c.clientPhone,
        agentId: c.agent?.id,
        matches: c.clientPhone === clientPhone && c.agent?.id === agentId
      });
    });

    // Filter manually since InstantDB admin SDK query might not support complex where clauses
    const existingConversation = allConversations?.conversations?.find((c: any) => {
      // Normalize the stored phone number too
      const storedPhone = c.clientPhone?.startsWith('=') ? c.clientPhone.substring(1) : c.clientPhone;
      const phoneMatch = storedPhone === clientPhone;
      const agentMatch = c.agent?.id === agentId;
      console.log(`Checking conversation ${c.id}: phone=${phoneMatch} (${storedPhone} vs ${clientPhone}), agent=${agentMatch} (${c.agent?.id} vs ${agentId})`);
      return phoneMatch && agentMatch;
    });

    console.log("Existing conversation found:", !!existingConversation);
    if (existingConversation) {
      console.log("Matched conversation ID:", existingConversation.id);
    }

    let conversationId: string;

    if (existingConversation) {
      // Existing conversation
      conversationId = existingConversation.id;
      console.log("Using existing conversation:", conversationId);

      // Update lastMessageAt
      await db.transact([
        db.tx.conversations[conversationId].update({
          lastMessageAt: Date.now()
        })
      ]);
    } else {
      // Create new conversation
      conversationId = crypto.randomUUID();
      console.log("Creating new conversation:", conversationId);

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
