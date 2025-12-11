import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/instant";
import type { Message } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, UserCheck, BotIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

interface ChatViewProps {
  conversation: any;
}

export function ChatView({ conversation }: ChatViewProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages || [];

  // Debug: log messages to console
  console.log('Conversation messages:', {
    conversationId: conversation?.id,
    messageCount: messages.length,
    messages: messages.map((m: any) => ({
      id: m.id,
      senderType: m.senderType,
      content: m.content?.substring(0, 50),
      createdAt: m.createdAt
    }))
  });

  const sendMessage = async (content: string) => {
    if (!conversation?.id) return;

    try {
      const messageId = crypto.randomUUID();

      // Add message to InstantDB
      await db.transact([
        db.tx.messages[messageId].update({
          senderType: "HUMAN",
          content,
          senderName: "Human Agent"
        }),
        db.tx.messages[messageId].link({
          conversation: conversation.id
        }),
        // Update lastMessageAt
        db.tx.conversations[conversation.id].update({
          lastMessageAt: Date.now()
        })
      ]);

      // Send message to WhatsApp via n8n
      if (conversation.agent && conversation.agent.length > 0) {
        const agentId = conversation.agent[0].id;
        console.log("Sending message to n8n:", { conversationId: conversation.id, agentId, message: content });
        try {
          const response = await fetch("/api/n8n/send-message", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              conversationId: conversation.id,
              agentId: agentId,
              message: content
            })
          });

          const result = await response.json();
          console.log("n8n response:", result);

          if (!response.ok) {
            console.error("n8n webhook failed:", result);
            toast({
              title: "Failed to send to WhatsApp",
              description: result.error || "Unknown error",
              variant: "destructive",
            });
          }
        } catch (webhookError) {
          console.error("Failed to send to n8n:", webhookError);
          toast({
            title: "Network error",
            description: "Could not connect to n8n",
            variant: "destructive",
          });
        }
      } else {
        console.warn("No agent configured for this conversation");
      }

      setMessageText("");
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const takeControl = async () => {
    if (!conversation?.id) return;

    try {
      await db.transact([
        db.tx.conversations[conversation.id].update({
          status: "HUMAN_ACTIVE"
        })
      ]);
      toast({
        title: "Control taken",
        description: "You are now handling this conversation",
      });
    } catch (error: any) {
      toast({
        title: "Failed to take control",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const returnToAI = async () => {
    if (!conversation?.id) return;

    try {
      await db.transact([
        db.tx.conversations[conversation.id].update({
          status: "AI_ACTIVE"
        })
      ]);
      toast({
        title: "Returned to AI",
        description: "The AI agent is now handling this conversation",
      });
    } catch (error: any) {
      toast({
        title: "Failed to return to AI",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
          <p className="text-sm text-muted-foreground">
            Choose a conversation from the list to start chatting
          </p>
        </div>
      </div>
    );
  }

  const isHumanActive = conversation.status === "HUMAN_ACTIVE";

  const getMessageBubbleClass = (senderType: string) => {
    if (senderType === "CLIENT") {
      return "bg-muted text-foreground";
    }
    if (senderType === "AI") {
      return "bg-green-600/10 text-foreground border-l-2 border-green-600";
    }
    return "bg-blue-600/10 text-foreground border-l-2 border-blue-600";
  };

  const getMessageAlignment = (senderType: string) => {
    return senderType === "CLIENT" ? "justify-start" : "justify-end";
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-conversation-client-name">
              {conversation.clientName || conversation.clientPhone}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-conversation-client-phone">
              {conversation.clientPhone}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isHumanActive ? (
              <>
                <Badge variant="secondary" className="bg-blue-600/10 text-blue-700 dark:text-blue-400">
                  <UserCheck className="h-3 w-3 mr-1" />
                  You're in control
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={returnToAI}
                  data-testid="button-return-to-ai"
                >
                  <BotIcon className="h-4 w-4 mr-2" />
                  Return to AI
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-400">
                  <BotIcon className="h-3 w-3 mr-1" />
                  AI Active
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={takeControl}
                  data-testid="button-take-control"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Take Control
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Debug: Show message count */}
        <div className="text-xs text-muted-foreground text-center mb-2">
          {messages.length} message(s) in this conversation
        </div>
        {messages && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages?.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${getMessageAlignment(message.senderType)}`}
              data-testid={`message-${message.id}`}
            >
              <div className="max-w-[70%]">
                <div
                  className={`rounded-lg p-3 ${getMessageBubbleClass(message.senderType)}`}
                  data-testid={`message-bubble-${message.senderType.toLowerCase()}`}
                >
                  {/* Debug: Show message index and ID */}
                  <p className="text-xs text-muted-foreground mb-1 opacity-50">
                    #{index + 1} - {message.id.substring(0, 8)}
                  </p>
                  {message.senderName && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.senderName}
                    </p>
                  )}
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none" data-testid={`message-content-${message.id}`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {message.createdAt && (
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (messageText.trim()) {
              sendMessage(messageText);
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={
              isHumanActive
                ? "Type your message..."
                : "Take control to send messages"
            }
            disabled={!isHumanActive}
            data-testid="input-message"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!isHumanActive || !messageText.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {!isHumanActive && (
          <p className="text-xs text-muted-foreground mt-2">
            Take control of this conversation to send messages
          </p>
        )}
      </div>
    </div>
  );
}
