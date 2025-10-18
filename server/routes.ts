// Reference: javascript_websocket blueprint integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  authMiddleware,
  hashPassword,
  verifyPassword,
  generateToken,
  type AuthRequest,
} from "./auth";
import {
  registerSchema,
  loginSchema,
  insertAgentSchema,
  insertMessageSchema,
} from "@shared/schema";

// Store active WebSocket connections by user ID with organization info
interface SocketConnection {
  socket: WebSocket;
  organizationId: string;
}
const connections = new Map<string, SocketConnection[]>();

function broadcastToOrganization(organizationId: string, data: any) {
  connections.forEach((socketConnections) => {
    socketConnections.forEach((conn) => {
      // Only send to sockets that belong to the same organization
      if (conn.organizationId === organizationId && conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(data));
      }
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      const organization = await storage.createOrganization({
        name: data.organizationName,
      });

      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash,
        organizationId: organization.id,
      });

      const token = generateToken(user.id);
      res.json({ token, user: { ...user, passwordHash: undefined } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const valid = await verifyPassword(data.password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken(user.id);
      res.json({ token, user: { ...user, passwordHash: undefined } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    res.json({ ...req.user, passwordHash: undefined });
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthRequest, res) => {
    res.json({ success: true });
  });

  // Agents routes
  app.get("/api/agents", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const agents = await storage.getAgents(req.user!.organizationId!);
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agents", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAgentSchema.parse({
        ...req.body,
        organizationId: req.user!.organizationId,
      });

      const agent = await storage.createAgent(data);

      await storage.createAuditLog({
        userId: req.user!.id,
        agentId: agent.id,
        action: "CREATE_AGENT",
        details: `Created agent: ${agent.name}`,
      });

      res.json(agent);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/agents/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const data = insertAgentSchema.parse({
        ...req.body,
        organizationId: req.user!.organizationId,
      });

      const updated = await storage.updateAgent(req.params.id, data);

      await storage.createAuditLog({
        userId: req.user!.id,
        agentId: updated.id,
        action: "UPDATE_AGENT",
        details: `Updated agent: ${updated.name}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/agents/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      await storage.deleteAgent(req.params.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        agentId: agent.id,
        action: "DELETE_AGENT",
        details: `Deleted agent: ${agent.name}`,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conversations routes
  app.get("/api/conversations", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.organizationId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Verify conversation belongs to user's organization
      const agent = await storage.getAgent(conversation.agentId);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Verify conversation belongs to user's organization
      const agent = await storage.getAgent(conversation.agentId);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
        senderName: req.user!.name,
      });

      const message = await storage.createMessage(data);

      // Broadcast new message via WebSocket
      broadcastToOrganization(req.user!.organizationId!, {
        type: "new_message",
        conversationId: conversation.id,
        message,
      });

      // Send to n8n webhook (reuse agent from authorization check)
      if (agent && data.senderType === "HUMAN") {
        try {
          await fetch(agent.webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${agent.apiToken}`,
            },
            body: JSON.stringify({
              conversationId: conversation.id,
              clientPhone: conversation.clientPhone,
              message: message.content,
              senderType: "HUMAN",
            }),
          });
        } catch (error) {
          console.error("Failed to send to webhook:", error);
        }
      }

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/take-control", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Verify conversation belongs to user's organization
      const agent = await storage.getAgent(conversation.agentId);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const updated = await storage.updateConversation(req.params.id, {
        status: "HUMAN_ACTIVE",
        activeUserId: req.user!.id,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        conversationId: conversation.id,
        action: "TAKE_CONTROL",
        details: `Took control of conversation with ${conversation.clientPhone}`,
      });

      broadcastToOrganization(req.user!.organizationId!, {
        type: "conversation_updated",
        conversation: updated,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/return-to-ai", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Verify conversation belongs to user's organization
      const agent = await storage.getAgent(conversation.agentId);
      if (!agent || agent.organizationId !== req.user!.organizationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const updated = await storage.updateConversation(req.params.id, {
        status: "AI_ACTIVE",
        activeUserId: null,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        conversationId: conversation.id,
        action: "RETURN_TO_AI",
        details: `Returned conversation with ${conversation.clientPhone} to AI`,
      });

      broadcastToOrganization(req.user!.organizationId!, {
        type: "conversation_updated",
        conversation: updated,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for n8n to send messages
  app.post("/api/webhooks/messages", async (req, res) => {
    try {
      const { agentId, clientPhone, clientName, message, apiToken } = req.body;

      if (!agentId || !apiToken) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const agent = await storage.getAgent(agentId);
      if (!agent || agent.apiToken !== apiToken) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Find or create conversation
      const existingConversations = await storage.getConversations(agent.organizationId);
      let conversation = existingConversations.find(
        (c) => c.clientPhone === clientPhone && c.agentId === agentId
      );

      if (!conversation) {
        conversation = await storage.createConversation({
          agentId,
          clientPhone,
          clientName,
          status: "AI_ACTIVE",
          activeUserId: null,
        });
      }

      // Create message
      const newMessage = await storage.createMessage({
        conversationId: conversation.id,
        senderType: "CLIENT",
        content: message,
        senderName: clientName || clientPhone,
      });

      // Broadcast via WebSocket
      broadcastToOrganization(agent.organizationId, {
        type: "new_message",
        conversationId: conversation.id,
        message: newMessage,
      });

      res.json({ success: true, conversationId: conversation.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Audit logs route
  app.get("/api/audit-logs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await storage.getAuditLogs(req.user!.organizationId!);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.token) {
          const jwt = require('jsonwebtoken');
          const SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
          
          try {
            const payload = jwt.verify(data.token, SECRET) as { userId: string };
            userId = payload.userId;
            
            // Get user to retrieve organization ID
            const user = await storage.getUser(userId);
            if (!user || !user.organizationId) {
              ws.send(JSON.stringify({ type: 'auth_error', error: 'User not found' }));
              return;
            }
            
            if (!connections.has(userId)) {
              connections.set(userId, []);
            }
            
            // Store socket with organization ID for multi-tenant isolation
            connections.get(userId)!.push({
              socket: ws,
              organizationId: user.organizationId,
            });
            
            ws.send(JSON.stringify({ type: 'auth_success' }));
          } catch {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId && connections.has(userId)) {
        const socketConnections = connections.get(userId)!;
        const index = socketConnections.findIndex((conn) => conn.socket === ws);
        if (index > -1) {
          socketConnections.splice(index, 1);
        }
        if (socketConnections.length === 0) {
          connections.delete(userId);
        }
      }
    });
  });

  return httpServer;
}
