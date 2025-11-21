import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Phone } from "lucide-react";
import type { Conversation } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "AI_ACTIVE" | "HUMAN_ACTIVE">("all");

  // Deduplicate conversations by normalized phone number
  // Keep the most recent conversation for each unique phone number
  const deduplicatedConversations = useMemo(() => {
    const conversationMap = new Map<string, Conversation>();

    conversations.forEach((conv) => {
      const normalizedPhone = normalizePhoneNumber(conv.clientPhone);
      const existing = conversationMap.get(normalizedPhone);

      // Keep the conversation with the most recent message
      if (!existing || conv.lastMessageAt > existing.lastMessageAt) {
        conversationMap.set(normalizedPhone, conv);
      }
    });

    return Array.from(conversationMap.values());
  }, [conversations]);

  const filteredConversations = deduplicatedConversations.filter((conv) => {
    const normalizedPhone = normalizePhoneNumber(conv.clientPhone);
    const matchesSearch =
      conv.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      normalizedPhone.includes(normalizePhoneNumber(searchQuery));
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status === "AI_ACTIVE") {
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-400 border-l-2 border-green-600">
          AI Active
        </Badge>
      );
    }
    if (status === "HUMAN_ACTIVE") {
      return (
        <Badge variant="secondary" className="bg-blue-600/10 text-blue-700 dark:text-blue-400 border-l-2 border-blue-600">
          Human Active
        </Badge>
      );
    }
    return <Badge variant="secondary">Archived</Badge>;
  };

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border space-y-4">
        <h2 className="text-lg font-semibold">Conversations</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-conversations"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="AI_ACTIVE" data-testid="tab-ai-active">AI</TabsTrigger>
            <TabsTrigger value="HUMAN_ACTIVE" data-testid="tab-human-active">Human</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Phone className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`w-full text-left p-3 rounded-md hover-elevate transition-colors ${
                  selectedId === conversation.id
                    ? "bg-accent border-l-3 border-primary"
                    : ""
                }`}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm truncate" data-testid={`text-client-name-${conversation.id}`}>
                    {conversation.clientName || conversation.clientPhone}
                  </p>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 truncate">
                  {conversation.clientPhone}
                </p>
                {getStatusBadge(conversation.status)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
