// Reference: javascript_database blueprint integration
import {
  users,
  organizations,
  agents,
  conversations,
  messages,
  auditLogs,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type Agent,
  type InsertAgent,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;

  // Agents
  getAgents(organizationId: string): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent>;
  deleteAgent(id: string): Promise<void>;

  // Conversations
  getConversations(organizationId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Audit Logs
  getAuditLogs(organizationId: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

  // Agents
  async getAgents(organizationId: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.organizationId, organizationId));
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(insertAgent).returning();
    return agent;
  }

  async updateAgent(id: string, data: Partial<InsertAgent>): Promise<Agent> {
    const [agent] = await db.update(agents).set(data).where(eq(agents.id, id)).returning();
    return agent;
  }

  async deleteAgent(id: string): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }

  // Conversations
  async getConversations(organizationId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .innerJoin(agents, eq(conversations.agentId, agents.id))
      .where(eq(agents.organizationId, organizationId))
      .orderBy(desc(conversations.lastMessageAt))
      .then((rows) => rows.map((row) => row.conversations));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    return message;
  }

  // Audit Logs
  async getAuditLogs(organizationId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .then((rows) => rows.map((row) => row.audit_logs));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
