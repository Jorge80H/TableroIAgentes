import { useState, useMemo } from "react";
import { db } from "@/lib/instant";
import { ConversationList } from "@/components/conversation-list";
import { ChatView } from "@/components/chat-view";
import { MessageSquare } from "lucide-react";

export default function Conversations() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { isLoading, data } = db.useQuery({
    conversations: {
      messages: {
        $: {
          limit: 1000 // Ensure we get all messages
        }
      },
      agent: {}
    }
  });

  const conversations = data?.conversations || [];

  // Use useMemo to stabilize the selected conversation object
  const selectedConversation = useMemo(() => {
    const conv = conversations?.find((c: any) => c.id === selectedConversationId);

    // Debug: Log when selected conversation changes
    if (conv && selectedConversationId) {
      console.log('Selected conversation updated:', {
        id: selectedConversationId.substring(0, 8),
        messageCount: conv.messages?.length,
        messageIds: conv.messages?.map((m: any) => m.id.substring(0, 8))
      });
    }

    return conv;
  }, [conversations, selectedConversationId]);

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
