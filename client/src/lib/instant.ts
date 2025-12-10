import { init } from '@instantdb/react';

// Get the Instant App ID from environment variables
const APP_ID = import.meta.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';

// Define the schema types for TypeScript
type Schema = {
  organizations: {
    id: string;
    name: string;
    createdAt?: number;
  };
  agents: {
    id: string;
    name: string;
    webhookUrl: string;
    apiToken: string;
    isActive: boolean;
    createdAt?: number;
  };
  conversations: {
    id: string;
    clientPhone: string;
    clientName?: string;
    status: 'AI_ACTIVE' | 'HUMAN_ACTIVE' | 'ARCHIVED';
    lastMessageAt: number;
    createdAt?: number;
  };
  messages: {
    id: string;
    senderType: 'AI' | 'HUMAN' | 'CLIENT';
    content: string;
    senderName?: string;
    createdAt?: number;
  };
  auditLogs: {
    id: string;
    action: 'TAKE_CONTROL' | 'RETURN_TO_AI' | 'CREATE_AGENT' | 'DELETE_AGENT' | 'UPDATE_AGENT';
    details?: string;
    createdAt?: number;
  };
};

// Initialize InstantDB
export const db = init<Schema>({ appId: APP_ID });

// Export types for use in components
export type { Schema };
