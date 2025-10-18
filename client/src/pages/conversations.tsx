import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Conversation, Message } from "@shared/schema";
import { ConversationList } from "@/components/conversation-list";
import { ChatView } from "@/components/chat-view";
import { MessageSquare } from "lucide-react";

export default function Conversations() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r border-border bg-card">
          <div className="animate-pulse p-4 space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ConversationList
        conversations={conversations || []}
        selectedId={selectedConversationId}
        onSelect={setSelectedConversationId}
      />
      <ChatView conversation={selectedConversation} />
    </div>
  );
}
