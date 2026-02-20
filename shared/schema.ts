import { z } from "zod";

// ==================
// Type Definitions
// ==================

export type Organization = {
  id: string;
  name: string;
  createdAt?: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "AGENT";
  organizationId?: string;
  createdAt?: number;
};

export type Agent = {
  id: string;
  name: string;
  organizationId: string;
  webhookUrl: string;
  apiToken: string;
  isActive: boolean;
  createdAt?: number;
};

export type ConversationStatus = "AI_ACTIVE" | "HUMAN_ACTIVE" | "ARCHIVED";

export type Conversation = {
  id: string;
  clientPhone: string;
  clientName?: string;
  status: ConversationStatus;
  lastMessageAt: number;
  createdAt?: number;
  agent?: Agent[];
  messages?: Message[];
};

export type SenderType = "AI" | "HUMAN" | "CLIENT";

export type Message = {
  id: string;
  senderType: SenderType;
  content: string;
  senderName?: string;
  createdAt?: number;
};

export type AuditAction = "TAKE_CONTROL" | "RETURN_TO_AI" | "CREATE_AGENT" | "DELETE_AGENT" | "UPDATE_AGENT";

export type AuditLog = {
  id: string;
  action: AuditAction;
  details?: string;
  createdAt?: number;
};

// ==================
// Zod Validation Schemas
// ==================

export const insertAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  webhookUrl: z.string().url("Must be a valid URL"),
  apiToken: z.string().min(1, "API token is required"),
  organizationId: z.string().optional(),
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  organizationName: z.string().min(1, "Organization name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
