import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "ADMIN", "AGENT"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["AI_ACTIVE", "HUMAN_ACTIVE", "ARCHIVED"]);
export const senderTypeEnum = pgEnum("sender_type", ["AI", "HUMAN", "CLIENT"]);
export const auditActionEnum = pgEnum("audit_action", ["TAKE_CONTROL", "RETURN_TO_AI", "CREATE_AGENT", "DELETE_AGENT", "UPDATE_AGENT"]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("AGENT"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  webhookUrl: text("webhook_url").notNull(),
  apiToken: text("api_token").notNull(),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  clientPhone: text("client_phone").notNull(),
  clientName: text("client_name"),
  status: conversationStatusEnum("status").notNull().default("AI_ACTIVE"),
  activeUserId: varchar("active_user_id").references(() => users.id),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderType: senderTypeEnum("sender_type").notNull(),
  content: text("content").notNull(),
  senderName: text("sender_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  agentId: varchar("agent_id").references(() => agents.id),
  action: auditActionEnum("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  agents: many(agents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  activeConversations: many(conversations),
  auditLogs: many(auditLogs),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [agents.organizationId],
    references: [organizations.id],
  }),
  conversations: many(conversations),
  auditLogs: many(auditLogs),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  agent: one(agents, {
    fields: [conversations.agentId],
    references: [agents.id],
  }),
  activeUser: one(users, {
    fields: [conversations.activeUserId],
    references: [users.id],
  }),
  messages: many(messages),
  auditLogs: many(auditLogs),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [auditLogs.conversationId],
    references: [conversations.id],
  }),
  agent: one(agents, {
    fields: [auditLogs.agentId],
    references: [agents.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  role: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Register/Login schemas
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1, "Organization name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
